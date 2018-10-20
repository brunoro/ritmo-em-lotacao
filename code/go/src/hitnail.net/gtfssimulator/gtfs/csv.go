package gtfs

import (
	"bufio"
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
)

func ReadCSV(filename string, handler LineHandler) (IDMap, error) {
	log.Printf("Reading CSV file '%v'...", filename)

	m := IDMap{}
	f, err := os.Open(filename)
	if err != nil {
		return m, err
	}
	defer f.Close()

	rd := csv.NewReader(bufio.NewReader(f))
	rd.Read() // skip first line

	for {
		row, err := rd.Read()
		if err == io.EOF {
			log.Printf("%d rows", len(m))
			return m, nil
		}

		if err != nil {
			return m, err
		}

		d, err := handler(row)
		if err != nil {
			return m, err
		}
		m[d.ID()] = d
	}
}

func ReadRoute(r []string) (HasID, error) {
	rowLen := 4
	if len(r) < rowLen {
		return nil, fmt.Errorf("Row is too small, %d<%d", len(r), rowLen)
	}

	typ, err := strconv.Atoi(r[3])
	if err != nil {
		return nil, err
	}

	return Route{
		id:   r[0],
		Name: r[2],
		Type: typ,
	}, nil
}

func ReadStop(r []string) (HasID, error) {
	rowLen := 7
	if len(r) < rowLen {
		return nil, fmt.Errorf("Row is too small, %d<%d", len(r), rowLen)
	}

	return Stop{
		id:   r[0],
		Addr: r[1],
		Desc: r[2],
		Pos:  mkLatLon(r[3], r[4]),
	}, nil
}

func ReadTrip(r []string) (HasID, error) {
	rowLen := 5
	if len(r) < rowLen {
		return nil, fmt.Errorf("Row is too small, %d<%d", len(r), rowLen)
	}

	return Trip{
		id:        r[2],
		RouteID:   r[0],
		ServiceID: r[1],
		Headsign:  r[3],
		Direction: r[4],
	}, nil
}

func parseTime(t string) int {
	h := 0
	m := 0
	s := 0
	fmt.Sscanf(t, "%d:%d:%d", &h, &m, &s)
	return h*60*60 + m*60 + s
}

func ReadStopTime(r []string) (HasID, error) {
	rowLen := 6
	if len(r) < rowLen {
		return nil, fmt.Errorf("Row is too small, %d<%d", len(r), rowLen)
	}

	return StopTime{
		id:            fmt.Sprintf("%v_%v", r[0], r[4]),
		TripID:        r[0],
		StopID:        r[3],
		ArrivalTime:   parseTime(r[1]),
		DepartureTime: parseTime(r[2]),
	}, nil
}

func ReadService(r []string) (HasID, error) {
	rowLen := 10
	if len(r) < rowLen {
		return nil, fmt.Errorf("Row is too small, %d<%d", len(r), rowLen)
	}

	return Service{
		id:        r[0],
		Monday:    r[1] == "1",
		Tuesday:   r[2] == "1",
		Wednesday: r[3] == "1",
		Thursday:  r[4] == "1",
		Friday:    r[5] == "1",
		Saturday:  r[6] == "1",
		Sunday:    r[7] == "1",
	}, nil
}
