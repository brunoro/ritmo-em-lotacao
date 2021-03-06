import * as d3 from 'd3'
import * as L from 'leaflet'
import 'd3-hexbin'
import '@asymmetrik/leaflet-d3'
import 'leaflet-providers'
//@ts-ignore
import { Scale, Note } from 'tonal'
//@ts-ignore
import * as ADSREnvelope from 'adsr-envelope'
//@ts-ignore
import Oscillators from 'web-audio-oscillators'


type FloatPair = [number, number]

const tzOffset = 3*60*60*1000
const displayKV = (k: string, v: string) => document.getElementById(k).innerText = v
const timeString = (t:Date): string => new Date(t.getTime() - tzOffset).toISOString().substr(11,8)

const dt = 1000
let step = 1000

const timescaleSpan = document.getElementById("timescale-span")
const timescaleSlider = document.getElementById("timescale")
const updateStep = () => {
    const val = parseInt((timescaleSlider as HTMLInputElement).value)
    const scale = val*val
    timescaleSpan.innerText = scale.toString()
    step = scale * 1000
}
updateStep()
timescaleSlider.oninput = updateStep

const audioContext = new AudioContext()
const playFreq = (freq: number, vol: number, off: number) => {
    const osc = Oscillators.sine(audioContext)
    osc.frequency.value = freq

    const gain = audioContext.createGain()
    const filter = audioContext.createBiquadFilter();
    filter.frequency.value = 5000;

    osc.connect(gain)
    gain.connect(filter)
    filter.connect(audioContext.destination)

    const dur = dt/1000
    const et = dur/7
    const env = new ADSREnvelope({
        peakLevel: vol,
        attackTime: et,
        decayTime: et*2,
        sustainTime: et,
        releaseTime: et*3,
        duration: dur,
   })
 
    const up = audioContext.currentTime + off
    const down = up + dur + off

    osc.start(up)
    env.applyTo(gain.gain, up);
    osc.stop(down)
}

const rotate = (x:any[], i:number): any[] => [...x.slice(i, x.length), ...x.slice(0, i)];

const playArp = (size: number, shift: number, gain: number, jump: number) => {
    const scale = rotate(Scale.notes("D phrygian"), shift)
    for (let i=0; i<size; i++) {
        const oct = 3 + Math.floor(i/(jump*2))
        const scaleIndex = (i * jump) % scale.length
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
    .colorRange(['rgba(0, 159, 104, 0.15)', 'rgba(0, 159, 104, 1)'])

let t = new Date()
document.getElementById("now").onclick = () => t = new Date()

const sigmoid = (t:number) => 1/(1+Math.pow(Math.E, -t))

const tick = async () => {
    const url = `http://localhost:9090/state?t=${timeString(t)}`
    const coll = await d3.json<FloatPair[]>(url)
    const count = coll.length

    hexbin.data(coll)
    displayKV("time", t.toTimeString().substr(0,8))
    displayKV("count", count.toString())

    const arplen = Math.ceil(count/1000*2.4566)
    const arpstep = [2,3][Math.round(t.getTime()/46345)%2]
    const offset = (t.getTime()/123417) % 7
    const gain = sigmoid(count / 8000)
    console.log(`arplen=${arplen}; arpstep=${arpstep} offset=${offset} gain=${gain}`)
    playArp(arplen, offset, gain, arpstep)
    
    t = new Date(t.getTime() + step)
}
tick()
setInterval(tick, dt)