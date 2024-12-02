import React, { useState, useEffect } from 'react';
import { Card, Select, Space, Spin, Radio } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';

const ClimateDataComponent = () => {
    const [loading, setLoading] = useState(true);
    const [combinedData, setCombinedData] = useState([]);
    const [selectedMetric, setSelectedMetric] = useState('co2_per_capita');
    const [selectedRegion, setSelectedRegion] = useState('country');
    const [selectedCountry, setSelectedCountry] = useState('USA');
    const [selectedContinent, setSelectedContinent] = useState('Asia');
    const [availableCountries, setAvailableCountries] = useState([]);

    const metrics = [
        { value: 'co2_per_capita', label: 'CO2 per Capita' },
        { value: 'coal_co2_per_capita', label: 'Coal CO2 per Capita' },
        { value: 'gas_co2_per_capita', label: 'Gas CO2 per Capita' },
        { value: 'oil_co2_per_capita', label: 'Oil CO2 per Capita' },
        { value: 'cement_co2_per_capita', label: 'Cement CO2 per Capita' },
        { value: 'co2', label: 'Total CO2' },
        { value: 'co2_growth_prct', label: 'CO2 Growth %' }
    ];

    const continents = [
        { value: 'Asia', label: 'Asia' },
        { value: 'Europe', label: 'Europe' },
        { value: 'North America', label: 'North America' },
        { value: 'South America', label: 'South America' },
        { value: 'Africa', label: 'Africa' },
        { value: 'Oceania', label: 'Oceania' }
    ];

    useEffect(() => {
        loadCountries();
    }, []);

    useEffect(() => {
        if (availableCountries.length > 0) {
            loadData();
        }
    }, [selectedCountry, selectedMetric, selectedContinent, selectedRegion]);

    const loadCountries = async () => {
        try {
            const response = await fetch('/owid-co2-data.csv');
            const csvText = await response.text();
            const result = Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
            });

            const uniqueCountries = new Map();
            result.data.forEach(row => {
                if (row.iso_code &&
                    !row.iso_code.includes('OWID') &&
                    row.country) {
                    if (!uniqueCountries.has(row.iso_code)) {
                        uniqueCountries.set(row.iso_code, {
                            value: row.iso_code,
                            label: row.country
                        });
                    }
                }
            });

            const countriesArray = Array.from(uniqueCountries.values())
                .sort((a, b) => a.label.localeCompare(b.label));

            setAvailableCountries(countriesArray);
        } catch (error) {
            console.error('Error loading countries:', error);
        }
    };

    const processTemperatureDate = (dateStr) => {
        const [year] = dateStr.split('-');
        return parseInt(year);
    };

    const calculateYearlyAverage = (data) => {
        const yearlyData = {};

        data.forEach(row => {
            const year = processTemperatureDate(row.dt);
            if (!yearlyData[year]) {
                yearlyData[year] = {
                    sum: 0,
                    count: 0
                };
            }
            if (row.AverageTemperature != null) {
                yearlyData[year].sum += row.AverageTemperature;
                yearlyData[year].count += 1;
            }
        });

        return Object.entries(yearlyData)
            .map(([year, data]) => ({
                year: parseInt(year),
                temperature: data.count > 0 ? data.sum / data.count : null
            }))
            .sort((a, b) => a.year - b.year);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [co2Response, tempResponse] = await Promise.all([
                fetch('/owid-co2-data.csv'),
                fetch('/temp.csv')
            ]);

            const co2CsvText = await co2Response.text();
            const tempCsvText = await tempResponse.text();

            const co2Result = Papa.parse(co2CsvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
            });

            const tempResult = Papa.parse(tempCsvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
            });

            let filteredCo2Data;
            let filteredTempData;

            if (selectedRegion === 'country') {
                const selectedCountryName = availableCountries.find(c => c.value === selectedCountry)?.label;

                filteredCo2Data = co2Result.data
                    .filter(row => row.iso_code === selectedCountry && row[selectedMetric] != null);

                filteredTempData = tempResult.data
                    .filter(row => row.Country === selectedCountryName && row.AverageTemperature != null);
            } else {
                filteredCo2Data = co2Result.data
                    .filter(row =>
                        row.country === selectedContinent &&
                        !row.iso_code &&
                        row[selectedMetric] != null
                    );

                filteredTempData = tempResult.data
                    .filter(row =>
                        row.Country === selectedContinent &&
                        row.AverageTemperature != null
                    );
            }

            const processedCo2Data = filteredCo2Data
                .sort((a, b) => a.year - b.year)
                .slice(-60)
                .map(row => ({
                    year: row.year,
                    co2: row[selectedMetric]
                }));

            const yearlyTempData = calculateYearlyAverage(filteredTempData)
                .slice(-60);

            // Combine the data
            const combined = processedCo2Data.map(co2Row => {
                const tempRow = yearlyTempData.find(t => t.year === co2Row.year);
                return {
                    year: co2Row.year,
                    co2: co2Row.co2,
                    temperature: tempRow?.temperature
                };
            });

            setCombinedData(combined);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length > 0) {
            return (
                <div className="bg-white p-4 border rounded shadow">
                    <p className="font-bold">Year: {label}</p>
                    {payload[0] && (
                        <p className="text-[#8884d8]">
                            CO2: {payload[0].value?.toFixed(2)}
                        </p>
                    )}
                    {payload[1] && (
                        <p className="text-[#82ca9d]">
                            Temperature: {payload[1].value?.toFixed(2)}°C
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    const handleRegionChange = (e) => {
        setSelectedRegion(e.target.value);
        if (e.target.value === 'country') {
            setSelectedCountry('USA');
        } else {
            setSelectedContinent('Asia');
        }
    };

    return (
        <div className="p-4">
            <Space direction="vertical" size="large" className="w-full">
                <div className="flex gap-5 flex-wrap items-center">
                    <Radio.Group value={selectedRegion} onChange={handleRegionChange}>
                        <Radio.Button value="country">Country</Radio.Button>
                        <Radio.Button value="continent">Continent</Radio.Button>
                    </Radio.Group>

                    {selectedRegion === 'country' ? (
                        <Select
                            className="w-72"
                            value={selectedCountry}
                            onChange={setSelectedCountry}
                            showSearch
                            optionFilterProp="label"
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {availableCountries.map(country => (
                                <option
                                    key={country.value}
                                    value={country.value}
                                    label={country.label}
                                >
                                    {country.label}
                                </option>
                            ))}
                        </Select>
                    ) : (
                        <Select
                            className="w-48"
                            value={selectedContinent}
                            onChange={setSelectedContinent}
                        >
                            {continents.map(continent => (
                                <option key={continent.value} value={continent.value}>
                                    {continent.label}
                                </option>
                            ))}
                        </Select>
                    )}

                    <Select
                        className="w-48"
                        value={selectedMetric}
                        onChange={setSelectedMetric}
                    >
                        {metrics.map(metric => (
                            <option key={metric.value} value={metric.value}>
                                {metric.label}
                            </option>
                        ))}
                    </Select>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <Card>
                        <div className="p-4" style={{width:"94vw"}}>
                            <h3 className="text-lg font-semibold mb-4">Climate Data Visualization</h3>
                            {loading ? (
                                <div className="h-96 flex justify-center items-center">
                                    <Spin size="large" />
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart
                                        data={combinedData}
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="year"
                                            type="number"
                                            domain={['auto', 'auto']}
                                        />
                                        <YAxis
                                            yAxisId="co2"
                                            orientation="left"
                                            stroke="#8884d8"
                                        />
                                        <YAxis
                                            yAxisId="temp"
                                            orientation="right"
                                            stroke="#82ca9d"
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Line
                                            yAxisId="co2"
                                            type="monotone"
                                            dataKey="co2"
                                            stroke="#8884d8"
                                            name="CO2 Data"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                        <Line
                                            yAxisId="temp"
                                            type="monotone"
                                            dataKey="temperature"
                                            stroke="#82ca9d"
                                            name="Temperature (°C)"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <div className="p-4">
                            <h3 className="text-lg font-semibold mb-4">Data Details</h3>
                            <p>Region: {selectedRegion === 'country' ?
                                availableCountries.find(c => c.value === selectedCountry)?.label :
                                selectedContinent}
                            </p>
                            <p>CO2 Metric: {metrics.find(m => m.value === selectedMetric)?.label}</p>
                            <p>Latest CO2 Value: {combinedData[combinedData.length - 1]?.co2?.toFixed(2) || 'N/A'}</p>
                            <p>Latest Temperature: {combinedData[combinedData.length - 1]?.temperature?.toFixed(2) || 'N/A'}°C</p>
                        </div>
                    </Card>
                </div>
            </Space>
        </div>
    );
};

export default ClimateDataComponent;