import React, { useState, useEffect } from 'react';
import { Card, Space, Select, Spin } from 'antd';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import Papa from 'papaparse';

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

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

const isoAlpha3ToNumeric = Object.entries(isoNumericToAlpha3).reduce((acc, [num, alpha]) => {
    acc[alpha] = num;
    return acc;
}, {});

const TrendsAndComparisons = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [selectedMetric, setSelectedMetric] = useState('co2_per_capita');
    const [selectedCountries, setSelectedCountries] = useState([]);
    const [rawData, setRawData] = useState([]);
    const [countryData, setCountryData] = useState({});

    const metrics = [
        { value: 'coal_co2_per_capita', label: 'Coal CO2 per Capita' },
        { value: 'co2_per_capita', label: 'CO2 per Capita' },
        { value: 'co2', label: 'Total CO2' },
        { value: 'co2_growth_prct', label: 'CO2 Growth %' },
        { value: 'gas_co2_per_capita', label: 'Gas CO2 per Capita' },
        { value: 'oil_co2_per_capita', label: 'Oil CO2 per Capita' },
        { value: 'cement_co2_per_capita', label: 'Cement CO2 per Capita' },
        { value: 'ghg_per_capita', label: 'GHG per Capita' },
        { value: 'population', label: 'Population' }
    ];

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

    useEffect(() => {
        const loadData = async () => {
            try {
                const response = await fetch('/owid-co2-data.csv');
                const csvText = await response.text();
                const result = Papa.parse(csvText, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                });

                setRawData(result.data);
                const processed = processData(result.data);
                setData(processed);

                const countries = {};
                result.data.forEach(row => {
                    if (row.iso_code && row.year === 2022) {
                        const numericCode = isoAlpha3ToNumeric[row.iso_code];
                        if (numericCode) {
                            countries[numericCode] = {
                                name: row.country,
                                value: row[selectedMetric],
                                alpha3: row.iso_code
                            };
                        }
                    }
                });
                setCountryData(countries);
                setLoading(false);
            } catch (error) {
                console.error('Error loading data:', error);
                setLoading(false);
            }
        };

        loadData();
    }, []);

    useEffect(() => {
        if (rawData.length > 0) {
            setData(processData(rawData));
        }
    }, [selectedCountries, selectedMetric]);

    const processData = (rawData) => {
        const yearData = {};
        rawData.forEach(row => {
            if (row.year >= 1950 && row.iso_code && selectedCountries.includes(row.iso_code)) {
                if (!yearData[row.year]) {
                    yearData[row.year] = { year: row.year };
                }
                yearData[row.year][row.iso_code] = row[selectedMetric];
            }
        });
        return Object.values(yearData).sort((a, b) => a.year - b.year);
    };

    const calculateSectorData = () => {
        if (!data.length) return [];
        const latestData = data[data.length - 1];
        return selectedCountries.map(country => ({
            name: countryData[isoAlpha3ToNumeric[country]]?.name || country,
            value: latestData[country] || 0
        }));
    };

    const calculateEmissionsMix = () => {
        if (!rawData.length || !selectedCountries.length) return [];
        const latestYear = Math.max(...rawData.map(d => d.year));
        const selectedCountry = selectedCountries[0];

        const countryData = rawData.find(d =>
            d.iso_code === selectedCountry && d.year === latestYear
        );

        if (!countryData) return [];

        return [
            { name: 'Coal', value: countryData.coal_co2_per_capita || 0 },
            { name: 'Oil', value: countryData.oil_co2_per_capita || 0 },
            { name: 'Gas', value: countryData.gas_co2_per_capita || 0 },
            { name: 'Cement', value: countryData.cement_co2_per_capita || 0 }
        ].filter(item => item.value > 0);
    };

    const handleCountryClick = (geo) => {
        const countryISO = isoNumericToAlpha3[geo.id];
        if (countryISO) {
            if (selectedCountries.includes(countryISO)) {
                setSelectedCountries(selectedCountries.filter(code => code !== countryISO));
            } else if (selectedCountries.length < 5) {
                setSelectedCountries([...selectedCountries, countryISO]);
            }
        }
    };

    const getCountryColor = (geo) => {
        const countryISO = isoNumericToAlpha3[geo.id];
        if (selectedCountries.includes(countryISO)) {
            return '#F88379';
        }
        return '#D6D6DA';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="p-4 w-full">
            <div className="mb-4">
                <Select
                    style={{ width: 200 }}
                    value={selectedMetric}
                    onChange={setSelectedMetric}
                    options={metrics}
                />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                <div style={{ flex: '0 1 40%' }}>
                    <Card title="Select Countries from Map (max 5)">
                        <ComposableMap>
                            <ZoomableGroup center={[0, 30]} zoom={1}>
                                <Geographies geography={geoUrl}>
                                    {({ geographies }) =>
                                        geographies.map((geo) => (
                                            <Geography
                                                key={geo.rsmKey}
                                                geography={geo}
                                                fill={getCountryColor(geo)}
                                                stroke="#FFFFFF"
                                                style={{
                                                    default: { outline: 'none' },
                                                    hover: { fill: '#F53', outline: 'none' },
                                                    pressed: { outline: 'none' },
                                                }}
                                                onClick={() => handleCountryClick(geo)}
                                            />
                                        ))
                                    }
                                </Geographies>
                            </ZoomableGroup>
                        </ComposableMap>
                    </Card>
                </div>

                <div style={{ flex: '1 1 55%' }}>
                    <Card title="Country Comparison">
                        <ResponsiveContainer width="100%" height={450} >
                            <BarChart data={[data[data.length - 1]]}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis mirror={true}/>
                                <Tooltip />
                                <Legend />
                                {selectedCountries.map((country, index) => (
                                    <Bar
                                        key={country}
                                        dataKey={country}
                                        name={countryData[isoAlpha3ToNumeric[country]]?.name || country}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <Card title="Historical Trends">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis  mirror={true}/>
                            <Tooltip />
                            <Legend />
                            {selectedCountries.map((country, index) => (
                                <Line
                                    key={country}
                                    type="monotone"
                                    dataKey={country}
                                    name={countryData[isoAlpha3ToNumeric[country]]?.name || country}
                                    stroke={COLORS[index % COLORS.length]}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ flex: '1 1 45%', minWidth: '600px' }}>
                    <Card title="Share of Total Emissions">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={calculateSectorData()}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {calculateSectorData().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </div>

                <div style={{ flex: '1 1 45%', minWidth: '600px' }}>
                    <Card title="Emissions Mix">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={calculateEmissionsMix()}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {calculateEmissionsMix().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TrendsAndComparisons;