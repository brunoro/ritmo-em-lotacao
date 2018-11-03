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
        console.log(`[${i+1}/${size}] #${scaleIndex}:${oct} ${note}=${freq} !${vol} ~> ${off}`)
        playFreq(freq, vol, off)
    }
}

const center = [-19.926752, -43.939384]
const map = L.map('map', { 
    center: new L.LatLng(center[0], center[1]),
    zoom: 12,
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
    radius: 12,
    opacity: 0.8,
    duration: 20,
}).addTo(map)


hexbin
    .lat((d: FloatPair) => d[0])
    .lng((d: FloatPair) => d[1])
    .colorRange(['white', 'blue'])
    .colorScaleExtent([0, 100]) // TODO: use config call to update this
    .duration(dt)

var t = new Date()

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
    playArp(numNotes, offset, gain)
    
    t = new Date(t.getTime() + step)
}
tick()
setInterval(tick, dt)