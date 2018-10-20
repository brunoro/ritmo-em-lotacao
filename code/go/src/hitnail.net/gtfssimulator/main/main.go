package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path"

	"github.com/vmihailenco/msgpack"
	"hitnail.net/gtfssimulator/gtfs"
	"hitnail.net/gtfssimulator/util"
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

	log.Printf("Extracting schedule info from GTFS data...")
	sched, err := gtfs.NewSchedule(routes, trips, stops, stopTimes, services)
	log.Printf("Done")

	return sched, err
}

func save(filename string, sch gtfs.Schedule) error {
	log.Printf("Saving schedule to '%v'", filename)
	file, err := os.Create(filename)
	if err == nil {
		encoder := msgpack.NewEncoder(file)
		encoder.Encode(sch)
	}
	file.Close()
	log.Printf("Done")

	return err
}

func load(filename string) (gtfs.Schedule, error) {
	log.Printf("Loading schedule from '%v'", filename)
	file, err := os.Open(filename)
	sch := gtfs.Schedule{}
	if err == nil {
		decoder := msgpack.NewDecoder(file)
		err = decoder.Decode(&sch)
	}
	file.Close()
	log.Printf("Done")

	return sch, err
}

func main() {
	feed := flag.String("feed", "", "path of the gtfs feed")
	flag.Parse()

	var sch gtfs.Schedule
	var err error
	if *feed != "" {
		sch, err = readGTFS(*feed)
	} else {
		flag.PrintDefaults()
		panic("Missing input file")
	}
	if err != nil {
		panic(err)
	}

	t := "18:27:00"
	log.Printf("Querying active lines at %v...", t)
	secs := util.HHMMSSToSecs(t)

	lines := sch.ActiveLines(secs, "01")

	for _, line := range lines {
		fmt.Println(line.Trip.ID,
			util.SecsToHHMMSS(line.DepartureTime),
			util.SecsToHHMMSS(line.ArrivalTime),
			line.Route.ID,
			line.Trip.Headsign)
	}

	log.Printf("Found %d lines", len(lines))
}
