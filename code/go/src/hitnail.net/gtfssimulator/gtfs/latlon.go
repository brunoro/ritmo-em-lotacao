package gtfs

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

type LatLon [2]float64

func parseFloat(s string) float64 {
	s = strings.TrimSpace(s)
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

func mkLatLon(lat string, lon string) LatLon {
	return LatLon{parseFloat(lon), parseFloat(lat)}
}

func (a LatLon) vectorTo(b LatLon) LatLon {
	return LatLon{b[0] - a[0], b[1] - a[1]}
}

func (a LatLon) distanceTo(b LatLon) float64 {
	v := a.vectorTo(b)
	return math.Sqrt(math.Pow(v[0], 2) + math.Pow(v[1], 2))
}

func (a LatLon) vectorMul(x float64) LatLon {
	return LatLon{a[0] * x, a[1] * x}
}

func (a LatLon) vectorAdd(b LatLon) LatLon {
	return LatLon{a[0] + b[0], a[1] + b[1]}
}

func (a LatLon) intermediateTo(b LatLon, x float64) (LatLon, error) {
	if x < 0 || x > 1 {
		return LatLon{}, fmt.Errorf("InterpolateLatLon: x=%v not in range [0, 1]", x)
	}
	return a.vectorAdd(a.vectorTo(b).vectorMul(x)), nil

}
