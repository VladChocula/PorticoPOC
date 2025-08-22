import fs from "fs";
import pdf from "pdf-parse";
import { supabase } from "../supabase/supabaseClient.js";
const lineRegex = /^(\d{2})(\d{2})\s+(.+?),\s+(.+)$/;
async function main() {
    const pdfBuffer = fs.readFileSync("docs/cnctycode.pdf");
    const data = await pdf(pdfBuffer);
    const lines = data.text.split("\n");
    const entries = [];
    for (const line of lines) {
        const match = lineRegex.exec(line.trim());
        if (match) {
            const [, county_code, municip_code, county_name, municipality_name] = match;
            entries.push({
                county_code,
                municip_code,
                muni_fips: county_code + municip_code,
                county_name,
                municipality_name,
            });
        }
    }
    console.log(`Parsed ${entries.length} entries`);
    //Push to db
    const { data: inserted, error } = await supabase
        .from("nj_municipality_codes")
        .insert(entries);
    if (error) {
        console.error("Insert error:", error);
    }
    else {
        console.log("Inserted successfully:", inserted?.length);
    }
}
main().catch(console.error);
//# sourceMappingURL=parse-pdf.js.map