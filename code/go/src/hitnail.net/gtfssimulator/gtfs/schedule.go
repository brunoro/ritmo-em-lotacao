package gtfs

import (
	"fmt"
	"log"
	"math/rand"
)

type Schedule struct {
	Routes    Map
	Stops     Map
	Trips     List
	StopTimes ListMap
	Services  Map
}

func (x Schedule) GetRoute(id string) (Route, bool) {
	d, ok := x.Routes[id]
	if ok {
		return d.(Route), true
	}
	return Route{}, false
}

func (x Schedule) StopTimesForTrip(tripID string) ([]*StopTime, bool) {
	sts := []*StopTime{}
	objs, ok := x.StopTimes[tripID]
	if !ok {
		return sts, false
	}
	for _, o := range objs {
		k := o.(StopTime)
		sts = append(sts, &k)
	}
	return sts, true
}

func (x Schedule) StopsForStopTimes(stopTimes []*StopTime) (map[string]*Stop, bool) {
	stops := map[string]*Stop{}
	for _, st := range stopTimes {
		o, ok := x.Stops[st.StopID]
		if !ok {
			log.Printf("StopTime '%v' has an unknown Stop '%v'", st.ID, st.StopID)
			return stops, false
		}
		k := o.(Stop)
		stops[st.StopID] = &k
	}
	return stops, true
}

func (x Schedule) LineFromTrip(trip Trip) (Line, error) {
	line := Line{Trip: &trip}

	route, ok := x.GetRoute(trip.RouteID)
	if !ok {
		return line, fmt.Errorf("Can't find route '%v'", trip.RouteID)
	}
	line.Route = &route

	stopTimes, ok := x.StopTimesForTrip(trip.ID)
	if !ok {
		log.Printf("Trip '%v' has no StopTimes", trip.ID)
	}
	line.StopTimes = stopTimes

	stops, _ := x.StopsForStopTimes(stopTimes)
	line.Stops = stops

	return line, nil
}

func (x Schedule) Lines() []Line {
	lines := []Line{}
	for _, trip := range x.Trips {
		line, _ := x.LineFromTrip(trip.(Trip))
		lines = append(lines, line)
	}
	return lines
}

func (x Schedule) RandomLine() Line {
	trip := x.Trips[rand.Intn(len(x.Trips))]
	line, _ := x.LineFromTrip(trip.(Trip))
	return line
}
