package gtfs

import (
	"log"
	"os"
	"path"
)

func ScheduleFromFolder(dir string) (Schedule, error) {
	log.Printf("Parsing GTFS feed at '%v'...", dir)
	sch := Schedule{}
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return sch, err
	}

	var err error

	routes, err := MapFromCSV(path.Join(dir, "routes.txt"), ReadRoute)
	if err != nil {
		return sch, err
	}
	trips, err := ListFromCSV(path.Join(dir, "trips.txt"), ReadTrip)
	if err != nil {
		return sch, err
	}
	stops, err := MapFromCSV(path.Join(dir, "stops.txt"), ReadStop)
	if err != nil {
		return sch, err
	}
	stopTimes, err := ListMapFromCSV(path.Join(dir, "stop_times.txt"), ReadStopTime)
	if err != nil {
		return sch, err
	}
	services, err := MapFromCSV(path.Join(dir, "calendar.txt"), ReadService)
	if err != nil {
		return sch, err
	}

	log.Printf("Extracting schedule info from GTFS data...")
	sched, err := NewSchedule(routes, trips, stops, stopTimes, services)
	log.Printf("Done")

	return sched, err
}
