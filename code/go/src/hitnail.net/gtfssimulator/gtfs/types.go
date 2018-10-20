package gtfs

type HasID interface {
	ID() string
}

type LatLon struct {
	Lat string
	Lon string
}

func mkLatLon(lat string, lon string) LatLon {
	return LatLon{Lat: lat, Lon: lon}
}

type Route struct {
	id   string
	Name string
	Type int
}

func (x Route) ID() string {
	return x.id
}

type Stop struct {
	id   string
	Addr string
	Desc string
	Pos  LatLon
}

func (x Stop) ID() string {
	return x.id
}

type Trip struct {
	id        string
	RouteID   string
	ServiceID string
	Headsign  string
	Direction string
}

func (x Trip) ID() string {
	return x.id
}

type StopTime struct {
	id            string
	TripID        string
	StopID        string
	ArrivalTime   int
	DepartureTime int
}

func (x StopTime) ID() string {
	return x.id
}

type Service struct {
	id        string
	Monday    bool
	Tuesday   bool
	Wednesday bool
	Thursday  bool
	Friday    bool
	Saturday  bool
	Sunday    bool
}

func (x Service) ID() string {
	return x.id
}

type IDMap map[string]HasID
type LineHandler func([]string) (HasID, error)

type Schedule struct {
	Routes    map[string]HasID
	Stops     map[string]HasID
	Trips     map[string]HasID
	StopTimes map[string]HasID
	Services  map[string]HasID
}

func (x Schedule) GetRoute(id string) (Route, bool) {
	d, ok := x.Routes[id]
	if ok {
		return d.(Route), true
	}
	return Route{}, false
}

func (x Schedule) GetStop(id string) (Stop, bool) {
	d, ok := x.Stops[id]
	if ok {
		return d.(Stop), true
	}
	return Stop{}, false
}

func (x Schedule) GetTrip(id string) (Trip, bool) {
	d, ok := x.Trips[id]
	if ok {
		return d.(Trip), true
	}
	return Trip{}, false
}

func (x Schedule) GetStopTime(id string) (StopTime, bool) {
	d, ok := x.StopTimes[id]
	if ok {
		return d.(StopTime), true
	}
	return StopTime{}, false
}

func (x Schedule) GetService(id string) (Service, bool) {
	d, ok := x.Services[id]
	if ok {
		return d.(Service), true
	}
	return Service{}, false
}
