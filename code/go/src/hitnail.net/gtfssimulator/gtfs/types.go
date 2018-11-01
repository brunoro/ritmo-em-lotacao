package gtfs

import (
	"strconv"
	"strings"
)

type HasKey interface {
	Key() string
}
type Map map[string]HasKey
type ListMap map[string][]HasKey
type List []HasKey

type LatLon [2]float32

func parseFloat(s string) float32 {
	s = strings.TrimSpace(s)
	f, _ := strconv.ParseFloat(s, 32)
	return float32(f)
}

func mkLatLon(lat string, lon string) LatLon {
	return LatLon{parseFloat(lon), parseFloat(lat)}
}

type Route struct {
	ID   string
	Name string
	Type int
}

func (x Route) Key() string {
	return x.ID
}

type Stop struct {
	ID   string
	Addr string
	Desc string
	Pos  LatLon
}

func (x Stop) Key() string {
	return x.ID
}

type Trip struct {
	ID        string
	RouteID   string
	ServiceID string
	Headsign  string
	Direction string
}

func (x Trip) Key() string {
	return x.ID
}

type StopTime struct {
	ID            string
	TripID        string
	StopID        string
	ArrivalTime   int
	DepartureTime int
}

func (x StopTime) Key() string {
	return x.TripID
}

type Service struct {
	ID        string
	Monday    bool
	Tuesday   bool
	Wednesday bool
	Thursday  bool
	Friday    bool
	Saturday  bool
	Sunday    bool
}

func (x Service) Key() string {
	return x.ID
}

type Line struct {
	Trip          *Trip
	Route         *Route
	Stops         map[string]*Stop
	StopTimes     []*StopTime
	DepartureTime int
	ArrivalTime   int
	Pos           LatLon
}
