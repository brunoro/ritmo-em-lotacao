import * as d3 from 'd3'
import * as L from 'leaflet'
import 'd3-hexbin'
import '@asymmetrik/leaflet-d3'
import 'leaflet-providers'

//@ts-ignore
import { Scale, Note } from 'tonal'
//@ts-ignore
import * as ADSREnvelope from 'adsr-envelope'

type FloatPair = [number, number]

const tzOffset = 3*60*60*1000
const displayKV = (k: string, v: string) => document.getElementById(k).innerText = v
const timeString = (t:Date): string => new Date(t.getTime() - tzOffset).toISOString().substr(11,8)
const msToString = (ms: number): string => { 
    const t = new Date(null)
    t.setSeconds(0, ms)
    return timeString(t)
}

const dt = 1000
const step = 5*60*1000

const audioContext = new AudioContext()
const playFreq = (freq: number, vol: number, off: number) => {
    const osc = audioContext.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq

    const gain = audioContext.createGain()

    osc.connect(gain)
    gain.connect(audioContext.destination)

    const dur = dt/1000
    const et = dur/5
    const env = new ADSREnvelope({
        peakLevel: vol,
        attackTime: et,
        decayTime: et,
        sustainTime: et*2,
        releaseTime: et,
        duration: dur,
   })
 
    const up = audioContext.currentTime + off
    const down = up + dur + off

    osc.start(up)
    env.applyTo(gain.gain, up);
    osc.stop(down)
}

const rotate = (x:any[], i:number): any[] => [...x.slice(i, x.length), ...x.slice(0, i)];

const playArp = (size: number, shift: number, gain: number) => {
    const scale = rotate(Scale.notes("D mixolydian"), shift)
    for (let i=0; i<size; i++) {
        const oct = 3 + Math.floor(i/4)
        const scaleIndex = (i * 3) % scale.length
        const note = Note.from({ oct }, scale[scaleIndex])
        const freq = Note.freq(note)
        const off = i * (2.5 / size)
        const vol = gain / size
        //console.log(`[${i+1}/${size}] #${scaleIndex}:${oct} ${note}=${freq} !${vol} ~> ${off}`)
        playFreq(freq, vol, off)
    }
}

const initialCenter = [-19.926752, -43.939384]
const minZoom = 12
const maxZoom = 14
const initialZoom = 12
const opacity = 0.8
const map = L.map('map', { 
    center: new L.LatLng(initialCenter[0], initialCenter[1]),
    zoom: initialZoom,
    minZoom, maxZoom
})

/*
map.dragging.disable();
map.touchZoom.disable();
map.doubleClickZoom.disable();
map.scrollWheelZoom.disable();
*/

//L.tileLayer.provider('CartoDB.PositronNoLabels').addTo(map)
//L.tileLayer.provider('CartoDB.DarkMatterNoLabels').addTo(map)
//L.tileLayer.provider('CartoDB.VoyagerNoLabels').addTo(map)
L.tileLayer.provider('Stamen.TonerBackground').addTo(map)
const hexbin = L.hexbinLayer({
    opacity: 0.8,
    duration: dt,
}).addTo(map)

const adjustZoom = () => {
    const z = map.getZoom()
    const zr = (z - minZoom) / (maxZoom - minZoom)
    const xzr = 1.0 + zr * 4
    hexbin.colorScaleExtent([1, 50 / xzr]) // TODO: use config call to update this
    //hexbin.opacity(opacity * xzr) // TODO: use config call to update this
}

adjustZoom()
map.on("zoomend", adjustZoom)

hexbin
    .lat((d: FloatPair) => d[0])
    .lng((d: FloatPair) => d[1])
    .colorRange(['rgba(0, 88, 252, 0.05)', 'rgba(0, 88, 252, 1)'])

var t = new Date()
t.setHours(10)

const sigmoid = (t:number) => 1/(1+Math.pow(Math.E, -t))

const tick = async () => {
    const url = `http://localhost:9090/state?t=${timeString(t)}`
    const coll = await d3.json<FloatPair[]>(url)
    const count = coll.length

    hexbin.data(coll)
    displayKV("time", t.toLocaleTimeString())
    displayKV("count", count.toString())
    displayKV("dt", msToString(dt))
    displayKV("step", msToString(step))

    const numNoteMul = 2
    const numNotes = Math.max(2, Math.ceil(count/dt*numNoteMul))
    const offset = (t.getTime() / 333) % 13 // marreta
    const gain = sigmoid(count / 7000)
    //playArp(numNotes, offset, gain)
    
    t = new Date(t.getTime() + step)
}
tick()
setInterval(tick, dt)