package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path"

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

func sampleNodes(lines []*gtfs.Line) []gtfs.LatLon {
	s := []gtfs.LatLon{}
	for _, l := range lines {
		mid := l.StopTimes[len(l.StopTimes)/2]
		s = append(s, l.Stops[mid.StopID].Pos)
	}
	return s
}

func startServer(sch gtfs.Schedule) {
	handlers := map[string]func(w http.ResponseWriter, r *http.Request){
		"/": func(w http.ResponseWriter, r *http.Request) {
			log.Printf("GET %v", r.URL)

			ts, ok := r.URL.Query()["t"]
			t := ts[0]

			if !ok || t == "" {
				http.Error(w, "No t provided", http.StatusInternalServerError)
				return
			}

			secs := util.HHMMSSToSecs(t)
			lines := sch.ActiveLines(secs, "01")
			nodes := sampleNodes(lines)
			js, err := json.Marshal(nodes)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.Write(js)
		},
	}

	for route, handler := range handlers {
		http.HandleFunc(route, handler)
	}

	port := ":9090"
	log.Printf("Listening at http://localhost%v", port)
	err := http.ListenAndServe(port, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
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

	startServer(sch)
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
