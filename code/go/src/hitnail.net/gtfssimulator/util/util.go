package util

import "fmt"

func SecsToHHMMSS(t int) string {
	if t == -1 {
		return ""
	}
	h := t / (3600)
	m := (t - (h * 3600)) / 60
	s := t - (m * 60) - (h * 3600)
	return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
}

func HHMMSSToSecs(t string) int {
	if t == "" {
		return -1
	}
	h := 0
	m := 0
	s := 0
	fmt.Sscanf(t, "%d:%d:%d", &h, &m, &s)
	return h*3600 + m*60 + s
}
