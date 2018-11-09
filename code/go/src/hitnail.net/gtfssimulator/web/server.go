package web

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"path"

	"hitnail.net/gtfssimulator/gtfs"
	"hitnail.net/gtfssimulator/util"

	_ "net/http/pprof"
)

func logRequest(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s %s\n", r.RemoteAddr, r.Method, r.URL)
		handler.ServeHTTP(w, r)
	})
}

func stateHandler(sch gtfs.Schedule) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("GET %v", r.URL)

		ts, ok := r.URL.Query()["t"]
		t := ts[0]

		if !ok || t == "" {
			http.Error(w, "No t provided", http.StatusInternalServerError)
			return
		}

		secs := util.HHMMSSToSecs(t)
		nodes := sch.PositionsAt(secs, "01")
		js, err := json.Marshal(nodes)
		nodes = nil
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(js)
	}
}

func staticHandler(staticPath string, filename string) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, path.Join(staticPath, filename))
	}
}

func StartServer(staticPath string, sch gtfs.Schedule) {
	http.HandleFunc("/", staticHandler(staticPath, "index.html"))
	http.HandleFunc("/bundle.js", staticHandler(staticPath, "bundle.js"))
	http.HandleFunc("/leaflet.css", staticHandler(staticPath, "leaflet.css"))
	http.HandleFunc("/state", stateHandler(sch))

	port := 9090
	log.Printf("Listening at http://localhost:%d", port)
	log.Printf("Serving static files from '%v'", staticPath)

	err := http.ListenAndServe(fmt.Sprintf(":%d", port), logRequest(http.DefaultServeMux))
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
