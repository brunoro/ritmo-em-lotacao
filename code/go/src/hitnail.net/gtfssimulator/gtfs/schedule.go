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

func (x Schedule) TripBounds(tripID string) (int, int, bool) {
	tStart := MaxInt
	tEnd := MinInt
	objs, ok := x.StopTimes[tripID]

	if !ok {
		return tStart, tEnd, false
	}
	for _, o := range objs {
		k := o.(StopTime)
		if k.DepartureTime != -1 && k.DepartureTime < tStart {
			tStart = k.DepartureTime
		}
		if k.ArrivalTime != -1 && k.ArrivalTime > tEnd {
			tEnd = k.ArrivalTime
		}
	}
	return tStart, tEnd, true
}

func (x Schedule) LineFromTrip(trip Trip) (Line, error) {
	line := Line{Trip: &trip}

	route, ok := x.GetRoute(trip.RouteID)
	if !ok {
		return line, fmt.Errorf("Can't find route '%v'", trip.RouteID)
	}
	line.Route = &route

	departureTime, arrivalTime, ok := x.TripBounds(trip.ID)
	if !ok {
		log.Printf("Trip '%v' has no StopTimes", trip.ID)
	}
	line.DepartureTime = departureTime
	line.ArrivalTime = arrivalTime

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

	sch.Lines = make([]Line, len(sch.Trips))
	for i, trip := range sch.Trips {
		line, _ := sch.LineFromTrip(trip.(Trip))
		sch.Lines[i] = line
	}
	return sch, nil
}

func (x Schedule) RandomLine() Line {
	return x.Lines[rand.Intn(len(x.Lines))]
}

func (x Schedule) ActiveLinesAt(t int, serviceID string) []Line {
	activeLines := []Line{}
	for _, line := range x.Lines {
		if line.Trip.ServiceID != serviceID {
			if line.DepartureTime > -1 && line.ArrivalTime > -1 {
				dep := line.DepartureTime
				arr := line.ArrivalTime
				if dep > arr {
					arr += 86400 // seconds in day
				}
				if dep < t && t < arr {
					activeLines = append(activeLines, line)
				}
			}
		}
	}
	return activeLines
}

func (x Schedule) PositionsAt(t int, serviceID string) []LatLon {
	pos := []LatLon{}
	for _, line := range x.Lines {
		if line.Trip.ServiceID != serviceID {
			if line.DepartureTime > -1 && line.ArrivalTime > -1 {
				dep := line.DepartureTime
				arr := line.ArrivalTime
				if dep > arr {
					arr += 86400 // seconds in day
				}
				if dep < t && t < arr {
					p, _ := x.LinePositionAt(t, line)
					pos = append(pos, p)
				}
			}
		}
	}
	return pos
}

func min(a int, b int) int {
	if a < b {
		return a
	}
	return b
}

func (x Schedule) GetStop(id string) Stop {
	return x.Stops[id].(Stop)
}

func (x Schedule) LinePositionAt(t int, l Line) (LatLon, error) {
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

			stopTimes := x.StopTimes[l.Trip.ID]
			ind := ratio * float64(len(stopTimes))

			lastI := len(stopTimes) - 1
			prevI := min(int(math.Floor(ind)), lastI)
			nextI := min(int(math.Ceil(ind)), lastI)

			prevT := stopTimes[prevI].(StopTime)
			nextT := stopTimes[nextI].(StopTime)

			prev := x.GetStop(prevT.StopID)
			next := x.GetStop(nextT.StopID)

			return prev.Pos.intermediateTo(next.Pos, ratio)
		}
	}
	return LatLon{}, fmt.Errorf("t='%v' doesn't belong in bounds=[%v, %v]", t, l.DepartureTime, l.ArrivalTime)
}
