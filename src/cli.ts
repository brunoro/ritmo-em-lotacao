#!/usr/bin/env node
import { getBHTransSnapshot } from './main'

const main = async () => {
    await getBHTransSnapshot();
}

main()
