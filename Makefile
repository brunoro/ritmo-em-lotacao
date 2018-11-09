MAIN=code/go/src/hitnail.net/gtfssimulator/main/main.go

sim:
	go run $(MAIN) -feed=gtfs -static=public

pack:
	node node_modules/webpack/bin/webpack.js --watch

build:
	go build -o forum_rmbh.bin $(MAIN)

build-win:
	GOOS=windows GOARCH=386 go build -o forum_rmbh.exe $(MAIN)