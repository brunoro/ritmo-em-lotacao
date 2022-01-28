import axios from 'axios'

export const getBHTransSnapshot = async () => {
    const url = 'https://temporeal.pbh.gov.br?param=C';

    console.info(`GET '${url}'`)
    const result = await axios.get(url);
    console.info(`${result.status} ${result.statusText}`);

    const rows = result.data.split('\n');
    rows.shift() // remove header

    console.info(`got ${rows.length} rows`);

    const data = rows.map((row: string) => {
        /*
         * row shape:
         * ['EV', 'HR', 'LT', 'LG', 'NV', 'VL', 'NL', 'DG', 'SV', 'DT']
         *
         * fields:
         * EV: event code (105=position tracked)
         * HR: datetime: YYYYMMDDhhmmss
         * LT: lat WGS84 fuso 23S
         * LG: long WGS84 fuso 23S
         * NV: vehicle number
         * VL: vehicle speed
         * NL: line number (need ids translate file)
         * DG: direction
         * SV: direction on trip (1=going, 2=returning)
         * DT: distance traveled
         */
        const fields = row.split(';');
        // LT, LG have comma decimal separators
        return fields.slice(2,4).map((c: string) => parseFloat(c.replace(',', '.')))
    });
    return data
}
