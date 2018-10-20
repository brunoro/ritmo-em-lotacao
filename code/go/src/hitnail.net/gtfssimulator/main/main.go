package main

import (
	"fmt"
	"log"
	"os"
	"path"

	"hitnail.net/gtfssimulator/gtfs"
)

func readGTFS(dir string) (gtfs.Schedule, error) {
	log.Printf("Parsing GTFS feed at '%v'...", dir)
	sch := gtfs.Schedule{}
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return sch, err
	}

	var err error

	routes, err := gtfs.MapFromCSV(path.Join(dir, "routes.txt"), gtfs.ReadRoute)
	if err != nil {
		return sch, err
	}
	trips, err := gtfs.ListFromCSV(path.Join(dir, "trips.txt"), gtfs.ReadTrip)
	if err != nil {
		return sch, err
	}
	stops, err := gtfs.MapFromCSV(path.Join(dir, "stops.txt"), gtfs.ReadStop)
	if err != nil {
		return sch, err
	}
	stopTimes, err := gtfs.ListMapFromCSV(path.Join(dir, "stop_times.txt"), gtfs.ReadStopTime)
	if err != nil {
		return sch, err
	}
	services, err := gtfs.MapFromCSV(path.Join(dir, "calendar.txt"), gtfs.ReadService)
	if err != nil {
		return sch, err
	}

	return gtfs.Schedule{
		Routes:    routes,
		Trips:     trips,
		Stops:     stops,
		StopTimes: stopTimes,
		Services:  services,
	}, nil
}

func main() {
	args := os.Args[1:]
	if len(args) == 0 {
		fmt.Println("Usage: ./gtfssimulator <gtfs_feed>")
	}
	sch, err := readGTFS(args[0])
	if err != nil {
		panic(err)
	}

	line := sch.RandomLine()
	fmt.Println(line.Trip)
	fmt.Println(line.Route)
	fmt.Println(line.Stops)
	fmt.Println(line.StopTimes)
}
