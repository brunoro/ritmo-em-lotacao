
sim:
	go run code/go/src/hitnail.net/gtfssimulator/main/main.go -feed=gtfs -static=public

pack:
	node node_modules/webpack/bin/webpack.js --watch