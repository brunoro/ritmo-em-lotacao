package gtfs

import (
	"fmt"
	"log"
	"math"
	"math/rand"
)

type Schedule struct {
	Routes    Map
	Stops     Map
	Trips     List
	StopTimes ListMap
	Services  Map
	Lines     []Line
}

func (x Schedule) GetRoute(id string) (Route, bool) {
	d, ok := x.Routes[id]
	if ok {
		return d.(Route), true
	}
	return Route{}, false
}

const MaxUint = ^uint(0)
const MinUint = 0
const MaxInt = int(MaxUint >> 1)
const MinInt = -MaxInt - 1

func (x Schedule) StopTimesForTrip(tripID string) ([]StopTime, int, int, bool) {
	tStart := MaxInt
	tEnd := MinInt
	sts := []StopTime{}
	objs, ok := x.StopTimes[tripID]
	if !ok {
		return sts, tStart, tEnd, false
	}
	for _, o := range objs {
		k := o.(StopTime)
		if k.DepartureTime != -1 && k.DepartureTime < tStart {
			tStart = k.DepartureTime
		}
		if k.ArrivalTime != -1 && k.ArrivalTime > tEnd {
			tEnd = k.ArrivalTime
		}
		sts = append(sts, k)
	}
	return sts, tStart, tEnd, true
}

func (x Schedule) StopsForStopTimes(stopTimes []StopTime) (map[string]Stop, bool) {
	stops := map[string]Stop{}
	for _, st := range stopTimes {
		o, ok := x.Stops[st.StopID]
		if !ok {
			log.Printf("StopTime '%v' has an unknown Stop '%v'", st.ID, st.StopID)
			return stops, false
		}
		k := o.(Stop)
		stops[st.StopID] = k
	}
	return stops, true
}

func (x Schedule) LineFromTrip(trip Trip) (Line, error) {
	line := Line{Trip: trip}

	route, ok := x.GetRoute(trip.RouteID)
	if !ok {
		return line, fmt.Errorf("Can't find route '%v'", trip.RouteID)
	}
	line.Route = route

	stopTimes, departureTime, arrivalTime, ok := x.StopTimesForTrip(trip.ID)
	if !ok {
		log.Printf("Trip '%v' has no StopTimes", trip.ID)
	}
	line.StopTimes = stopTimes
	line.DepartureTime = departureTime
	line.ArrivalTime = arrivalTime

	stops, _ := x.StopsForStopTimes(stopTimes)
	line.Stops = stops

	return line, nil
}

func NewSchedule(routes Map, trips List, stops Map, stopTimes ListMap, services Map) (Schedule, error) {
	sch := Schedule{
		Routes:    routes,
		Trips:     trips,
		Stops:     stops,
		StopTimes: stopTimes,
		Services:  services,
	}

	sch.Lines = []Line{}
	for _, trip := range sch.Trips {
		line, _ := sch.LineFromTrip(trip.(Trip))
		sch.Lines = append(sch.Lines, line)
	}
	return sch, nil
}

func (x Schedule) RandomLine() Line {
	return x.Lines[rand.Intn(len(x.Lines))]
}

func (x Schedule) ActiveLinesAt(t int, serviceID string) []*Line {
	activeLines := []*Line{}
	for _, line := range x.Lines {
		cp := line
		if line.Trip.ServiceID != serviceID {
			if line.DepartureTime > -1 && line.ArrivalTime > -1 {
				dep := line.DepartureTime
				arr := line.ArrivalTime
				if dep > arr {
					arr += 86400 // seconds in day
				}
				if dep < t && t < arr {
					activeLines = append(activeLines, &cp)
				}
			}
		}
	}
	return activeLines
}

func (x Schedule) PositionsAt(t int, serviceID string) []LatLon {
	activeLines := x.ActiveLinesAt(t, serviceID)
	pos := make([]LatLon, len(activeLines))
	for i, line := range activeLines {
		p, _ := line.PositionAt(t)
		pos[i] = p
	}
	return pos
}

func min(a int, b int) int {
	if a < b {
		return a
	}
	return b
}

func (l Line) PositionAt(t int) (LatLon, error) {
	dep := l.DepartureTime
	arr := l.ArrivalTime
	if dep > -1 && arr > -1 {
		if dep > arr {
			arr += 86400 // seconds in day
		}
		if dep < t && t < arr {
			dur := float64(arr - dep)
			off := float64(t - dep)

			ratio := off / dur
			ind := ratio * float64(len(l.StopTimes))

			lastI := len(l.StopTimes) - 1
			prevI := min(int(math.Floor(ind)), lastI)
			nextI := min(int(math.Ceil(ind)), lastI)

			prevT := l.StopTimes[prevI]
			nextT := l.StopTimes[nextI]

			prev := l.Stops[prevT.StopID]
			next := l.Stops[nextT.StopID]

			return prev.Pos.intermediateTo(next.Pos, ratio)
		}
	}
	return LatLon{}, fmt.Errorf("t='%v' doesn't belong in bounds=[%v, %v]", t, l.DepartureTime, l.ArrivalTime)
}
