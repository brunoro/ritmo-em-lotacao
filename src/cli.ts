#!/usr/bin/env node
import { getSnapshot, parseSnapshot } from './bhtrans'
import fs from 'fs';

const sleep = (delayMs: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, delayMs));

const writeSnapshotJSON = (data: object) => {
    const filename = `snapshot_${new Date().toISOString()}.json`;
    const json = JSON.stringify(data)
    fs.writeFileSync(filename, json);
}

const main = async () => {
    let rawData = await getSnapshot();
    let data = parseSnapshot(rawData);
    writeSnapshotJSON(data)

    console.log('waiting 30s...')
    await sleep(30000)

    rawData = await getSnapshot();
    data = parseSnapshot(rawData);
    writeSnapshotJSON(data)
}

main()
