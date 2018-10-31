package main

import (
	"flag"
	"fmt"
	"log"

	"hitnail.net/gtfssimulator/gtfs"
	"hitnail.net/gtfssimulator/util"
	"hitnail.net/gtfssimulator/web"
)

func main() {
	feed := flag.String("feed", "./gtfs", "path of the gtfs feed")
	static := flag.String("static", "./public", "path of the static files")
	flag.Parse()

	var sch gtfs.Schedule
	var err error
	if *feed != "" {
		sch, err = gtfs.ScheduleFromFolder(*feed)
	} else {
		flag.PrintDefaults()
		panic("Missing input file")
	}
	if err != nil {
		panic(err)
	}

	web.StartServer(*static, sch)
}

func test(sch gtfs.Schedule) {
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
