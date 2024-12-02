import React, { useState, useEffect, memo } from 'react';
import {
    ComposableMap,
    Geographies,
    Geography,
    ZoomableGroup
} from 'react-simple-maps';
import { Card, Space, Select, Slider, Spin, Button } from 'antd';
import { ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { scaleQuantile } from 'd3-scale';
import { feature } from "topojson-client";
import Papa from 'papaparse';

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

const COLOR_RANGE = [
    '#ffeda0',
    '#feb24c',
    '#f03b20',
    '#bd0026',
    '#800026'
];

// Conversion object from numeric ISO to alpha-3
const isoNumericToAlpha3 = {
    "4": "AFG", "8": "ALB", "12": "DZA", "16": "ASM", "20": "AND", "24": "AGO", "28": "ATG", "31": "AZE",
    "32": "ARG", "36": "AUS", "40": "AUT", "44": "BHS", "48": "BHR", "50": "BGD", "51": "ARM", "52": "BRB",
    "56": "BEL", "60": "BMU", "64": "BTN", "68": "BOL", "70": "BIH", "72": "BWA", "76": "BRA", "84": "BLZ",
    "90": "SLB", "96": "BRN", "100": "BGR", "104": "MMR", "108": "BDI", "112": "BLR", "116": "KHM",
    "120": "CMR", "124": "CAN", "132": "CPV", "140": "CAF", "144": "LKA", "148": "TCD",
    "152": "CHL", "156": "CHN", "170": "COL", "178": "COG", "180": "COD",
    "188": "CRI", "191": "HRV", "192": "CUB", "196": "CYP", "203": "CZE", "204": "BEN",
    "208": "DNK", "214": "DOM", "218": "ECU", "222": "SLV", "226": "GNQ", "231": "ETH",
    "232": "ERI", "233": "EST", "242": "FJI", "246": "FIN", "250": "FRA",
    "266": "GAB", "268": "GEO", "270": "GMB", "276": "DEU", "288": "GHA",
    "300": "GRC", "320": "GTM", "324": "GIN", "328": "GUY", "332": "HTI", "340": "HND", "344": "HKG", "348": "HUN",
    "352": "ISL", "356": "IND", "360": "IDN", "364": "IRN", "368": "IRQ", "372": "IRL", "376": "ISR",
    "380": "ITA", "384": "CIV", "388": "JAM", "392": "JPN", "398": "KAZ", "400": "JOR", "404": "KEN",
    "408": "PRK", "410": "KOR", "414": "KWT", "418": "LAO", "422": "LBN", "426": "LSO",
    "428": "LVA", "430": "LBR", "434": "LBY", "438": "LIE", "440": "LTU", "442": "LUX",
    "450": "MDG", "454": "MWI", "458": "MYS", "462": "MDV", "466": "MLI", "470": "MLT",
    "478": "MRT", "480": "MUS", "484": "MEX", "496": "MNG", "498": "MDA", "499": "MNE",
    "504": "MAR", "508": "MOZ", "512": "OMN", "516": "NAM", "524": "NPL",
    "528": "NLD", "548": "VUT", "554": "NZL", "558": "NIC", "562": "NER", "566": "NGA",
    "578": "NOR", "586": "PAK", "591": "PAN", "598": "PNG", "600": "PRY", "604": "PER",
    "608": "PHL", "616": "POL", "620": "PRT", "624": "GNB", "626": "TLS", "630": "PRI",
    "634": "QAT", "642": "ROU", "643": "RUS", "646": "RWA", "682": "SAU", "686": "SEN",
    "688": "SRB", "694": "SLE", "702": "SGP", "703": "SVK", "704": "VNM", "705": "SVN",
    "706": "SOM", "710": "ZAF", "716": "ZWE", "724": "ESP", "728": "SSD", "729": "SDN",
    "740": "SUR", "748": "SWZ", "752": "SWE", "756": "CHE", "760": "SYR", "762": "TJK",
    "764": "THA", "768": "TGO", "780": "TTO", "784": "ARE", "788": "TUN", "792": "TUR",
    "795": "TKM", "800": "UGA", "804": "UKR", "807": "MKD", "818": "EGY", "826": "GBR",
    "834": "TZA", "840": "USA", "854": "BFA", "858": "URY", "860": "UZB", "862": "VEN",
    "887": "YEM", "894": "ZMB"
};

// Create reverse mapping
const isoAlpha3ToNumeric = Object.entries(isoNumericToAlpha3).reduce((acc, [num, alpha]) => {
    acc[alpha] = num;
    return acc;
}, {});

const WorldMapVisualization = () => {
    const [selectedYear, setSelectedYear] = useState(2022);
    const [loading, setLoading] = useState(true);
    const [metric, setMetric] = useState('coal_co2_per_capita');
    const [rawData, setRawData] = useState([]);
    const [yearRange, setYearRange] = useState({ min: 1850, max: 2023 });
    const [tooltipContent, setTooltipContent] = useState('');
    const [yearData, setYearData] = useState({});
    const [geoData, setGeoData] = useState(null);
    const [position, setPosition] = useState({ coordinates: [0, 20], zoom: 1 });

    const handleZoomIn = () => {
        if (position.zoom >= 4) return;
        setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
    };

    const handleZoomOut = () => {
        if (position.zoom <= 1) return;
        setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
    };

    const metrics = [
        { value: 'coal_co2_per_capita', label: 'Coal CO2 per Capita' },
        { value: 'co2_per_capita', label: 'CO2 per Capita' },
        { value: 'co2', label: 'Total CO2' },
        { value: 'co2_growth_prct', label: 'CO2 Growth %' },
        { value: 'gas_co2_per_capita', label: 'Gas CO2 per Capita' },
        { value: 'oil_co2_per_capita', label: 'Oil CO2 per Capita' },
        { value: 'cement_co2_per_capita', label: 'Cement CO2 per Capita' },
        { value: 'ghg_per_capita', label: 'GHG per Capita' },
        { value: 'population', label: 'Population' },
    ];

    useEffect(() => {
        const loadData = async () => {
            try {
                const geoResponse = await fetch(geoUrl);
                const topology = await geoResponse.json();
                const geojson = feature(topology, topology.objects.countries);
                setGeoData(geojson);

                const response = await fetch('/owid-co2-data.csv');
                const csvText = await response.text();
                const result = Papa.parse(csvText, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                });

                const validData = result.data.filter(row => row.iso_code);
                const years = validData
                    .map(row => row.year)
                    .filter(year => year != null)
                    .sort((a, b) => a - b);

                setYearRange({
                    min: Math.min(...years),
                    max: Math.max(...years),
                });

                setRawData(validData);
                processDataForYear(validData, selectedYear, metric);
                setLoading(false);
            } catch (error) {
                console.error('Error loading data:', error);
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const processDataForYear = (data, year, selectedMetric) => {
        const yearData = {};
        data.forEach(row => {
            if (row.year === year && row.iso_code) {
                const value = row[selectedMetric];
                if (value != null && !isNaN(value)) {
                    const numericIso = isoAlpha3ToNumeric[row.iso_code];
                    if (numericIso) {
                        yearData[numericIso] = value;
                    }
                }
            }
        });
        setYearData(yearData);
    };

    useEffect(() => {
        if (rawData.length > 0) {
            processDataForYear(rawData, selectedYear, metric);
        }
    }, [selectedYear, metric, rawData]);

    const colorScale = scaleQuantile()
        .domain(Object.values(yearData).filter(d => d !== null && !isNaN(d)))
        .range(COLOR_RANGE);

    const getColor = (geo) => {
        const id = geo.id?.toString();
        const value = yearData[id];
        return value ? colorScale(value) : "#F5F4F6";
    };

    if (loading || !geoData) {
        return (
            <div style={{
                height: '300px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <Card style={{ height: 'auto' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Space>
                    <Select
                        value={metric}
                        onChange={setMetric}
                        options={metrics}
                        style={{ width: 200 }}
                    />
                </Space>

                <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '600px',
                    backgroundColor: '#fff'
                }}>
                    <div style={{
                        position: 'absolute',
                        right: '10px',
                        top: '10px',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                    }}>
                        <Button
                            onClick={handleZoomIn}
                            icon={<ZoomInIcon size={16} />}
                            disabled={position.zoom >= 4}
                            size="small"
                        />
                        <Button
                            onClick={handleZoomOut}
                            icon={<ZoomOutIcon size={16} />}
                            disabled={position.zoom <= 1}
                            size="small"
                        />
                    </div>

                    <ComposableMap
                        projectionConfig={{
                            rotate: [-10, 0, 0],
                            scale: 120
                        }}
                        style={{
                            height: '100%',
                            width: '100%'
                        }}
                    >
                        <ZoomableGroup
                            zoom={position.zoom}
                            center={position.coordinates}
                            maxZoom={4}
                            minZoom={1}
                            wheelZoom={false}
                        >
                            <Geographies geography={geoData}>
                                {({ geographies }) =>
                                    geographies.map(geo => {
                                        const id = geo.id?.toString();
                                        const value = yearData[id];
                                        const alpha3 = isoNumericToAlpha3[id];

                                        return (
                                            <Geography
                                                key={geo.rsmKey}
                                                geography={geo}
                                                fill={getColor(geo)}
                                                onMouseEnter={() => {
                                                    setTooltipContent(
                                                        `${geo.properties?.name} (${alpha3}): ${value ? value.toFixed(2) : 'No data'}`
                                                    );
                                                }}
                                                onMouseLeave={() => {
                                                    setTooltipContent('');
                                                }}
                                                style={{
                                                    default: {
                                                        stroke: "#FFFFFF",
                                                        strokeWidth: 0.5,
                                                        outline: "none",
                                                    },
                                                    hover: {
                                                        stroke: "#232323",
                                                        strokeWidth: 1,
                                                        outline: "none",
                                                    }
                                                }}
                                            />
                                        );
                                    })
                                }
                            </Geographies>
                        </ZoomableGroup>
                    </ComposableMap>

                    {tooltipContent && (
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            padding: '4px 8px',
                            background: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: '4px',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                            pointerEvents: 'none',
                            zIndex: 1000,
                            fontSize: '12px'
                        }}>
                            {tooltipContent}
                        </div>
                    )}
                </div>

                <div style={{ padding: '0 20px' }}>
                    <Slider
                        min={yearRange.min}
                        max={yearRange.max}
                        value={selectedYear}
                        onChange={setSelectedYear}
                        marks={{
                            [yearRange.min]: yearRange.min.toString(),
                            [Math.floor((yearRange.min + yearRange.max) / 2)]:
                                Math.floor((yearRange.min + yearRange.max) / 2).toString(),
                            [yearRange.max]: yearRange.max.toString(),
                        }}
                        tooltip={{
                            formatter: value => `Year: ${value}`,
                        }}
                    />
                </div>
            </Space>
        </Card>
    );
};

export default memo(WorldMapVisualization);