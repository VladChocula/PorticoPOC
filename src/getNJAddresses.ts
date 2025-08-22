import { supabase } from "../supabase/supabaseClient.ts";
import axios from "axios";

export interface MunicipalityCode {
    county_code: string;
    municip_code: string;
    muni_fips: string;
    county_name: string;
    municipality_name: string;
};

export interface NJGISAddress {
    objectid: number;
    pcl_mun: string;
    pcl_block: string;
    pcl_lot: string;
    cd_code: string;
    prop_class: string;
    prop_desc: string;
    county_name: string;
    municip_name: string;
    address: string;
    address_road: string;
    owner_address: string;
    owner_city_state: string;
    land_value: number;
    improvement_value: number;
    net_value: number;
    last_year_taxes: string;
    sale_price: number;
    year_constructed: string;
    bldg_desc: string;
    land_desc: string;
    calculated_acres: number;
    building_class: string;
    deed_book: string;
    deed_page: string;
    deed_date: string;
    dwellings: string;
    commercial_dwellings: string;
};

export const NJPropertyCodes: Record<string, string> = {
    "1": "Vacant Land",
    "2": "Residential Property",
    "3A": "Farm (Regular)",
    "3B": "Farm (Qualified)",
    "4A": "Commercial Property",
    "4B": "Industrial Property",
    "4C": "Apartments (5+ units)",
    "5A": "Railroad Class I",
    "5B": "Railroad Class II",
    "15A": "Public School (exempt)",
    "15B": "Other School Property (exempt)",
    "15C": "Public Property (exempt)",
    "15D": "Church & Charitable (exempt)",
    "15E": "Cemeteries & Graveyards (exempt)",
    "15F": "Other Exempt"
};

export async function getMuncipalityCodes(): Promise<MunicipalityCode[]> {
    const { data, error } = await supabase
        .from<MunicipalityCode>('nj_municipality_codes')
        .select('*')
        .order('muni_fips', { ascending: true });

    if (error) {
        console.error(`ERror fetching municipality codes:`, error.message);
        throw error;
    }

    return data ?? [];
};

export async function getNJAddressesByMunicipality(muniId: string): Promise<NJGISAddress[]> {
    const url = "https://services2.arcgis.com/XVOqAjTOJ5P6ngMu/arcgis/rest/services/Hosted_Parcels_Test_WebMer_20201016/FeatureServer/0/query";
    const params = {
        f: "json",
        where: `(PCL_MUN LIKE '${muniId.slice(0,2)}%') AND (PCL_MUN = '${muniId}')`,
        returnGeometry: false,
        outFields: "OBJECTID,PCL_MUN,PCLBLOCK,PCLLOT,CD_CODE,PROP_CLASS,COUNTY,MUN_NAME,PROP_LOC,ST_ADDRESS,CITY_STATE,LAND_VAL,IMPRVT_VAL,NET_VALUE,LAST_YR_TX,BLDG_DESC,LAND_DESC,CALC_ACRE,FAC_NAME,PROP_USE,BLDG_CLASS,DEED_BOOK,DEED_PAGE,DEED_DATE,YR_CONSTR,SALES_CODE,SALE_PRICE,DWELL,COMM_DWELL",
        outSR: 102100,
        resultOffset: 0,
        resultRecordCount: 5,
        spatialRel: "esriSpatialRelIntersects"
    };

    try {
        const response = await axios.get(url, { params });
        const features = response.data.features;
        if (!features.length) {
            console.log(`No addresses returned for ${muniId}`);
            console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
            return [];
        }
        const data: NJGISAddress[] = features.map((feature: any) => {
            const attr = feature.attributes;

            let addressRoad = "";
            if (attr.PROP_LOC) {
                const firstSpaceIndex = attr.PROP_LOC.indexOf(" ");
                if (firstSpaceIndex !== -1) {
                    addressRoad = attr.PROP_LOC.slice(firstSpaceIndex + 1);
                } else {
                    addressRoad = attr.PROP_LOC;
                }
            }

            return {
                objectid: attr.OBJECTID,
                pcl_mun: attr.PCL_MUN,
                pcl_block: attr.PCLBLOCK,
                pcl_lot: attr.PCLLOT,
                cd_code: attr.CD_CODE,
                prop_class: attr.PROP_CLASS,
                prop_desc: NJPropertyCodes[attr.PROP_CLASS] ?? "Unknown",
                county_name: attr.COUNTY,
                municip_name: attr.MUN_NAME,
                address: attr.PROP_LOC,
                address_road: addressRoad,
                owner_address: attr.ST_ADDRESS,
                owner_city_state: attr.CITY_STATE,
                land_value: attr.LAND_VAL,
                improvement_value: attr.IMPRVT_VAL,
                net_value: attr.NET_VALUE,
                last_year_taxes: attr.LAST_YR_TX,
                sale_price: attr.SALE_PRICE,
                year_constructed: attr.YR_CONSTR,
                bldg_desc: attr.BLDG_DESC,
                land_desc: attr.LAND_DESC,
                calculated_acres: attr.CALC_ACRE,
                building_class: attr.BLDG_CLASS,
                deed_book: attr.DEED_BOOK,
                deed_page: attr.DEED_PAGE,
                deed_date: attr.DEED_DATE,
                dwellings: attr.DWELL,
                commercial_dwellings: attr.COMM_DWELL
            };
        });

        return data;
    } catch (err) {
        console.error(`Error grabbing addresses in ${muniId}: ${err}`);
        return [];
    }
    
};

export async function uploadNJGIDAddressesToSupabase(dbName: string, data: NJGISAddress[]): Promise<void>{
    try {
        const { data: inserted, error } = await supabase
        .from(dbName)
        .insert(data)
        .select();
    
        if (error) {
            console.error("Insert Error:", error);
        } else {
            console.log(`Inserted ${inserted?.length ?? 0} rows successfully into ${dbName}`);
        }
    } catch (err) {
        console.error("Unexpected error inserting data:", err);
    }
    
};

async function main() {
    const municipTable = await getMuncipalityCodes();

    console.log("=== NJ Muncipality Codes ===");
    console.log(`\nTotal rows: ${municipTable.length}`);

    const addrData = await getNJAddressesByMunicipality('0101');

    console.log("\n=== NJ 0101 Addresses ===");
    console.log(`\nTotal rows: ${addrData.length}`);

    await uploadNJGIDAddressesToSupabase('nj_properties_addresses', addrData);
}

main().catch((err) => {
    console.error("Unexpected error:", err);
});

