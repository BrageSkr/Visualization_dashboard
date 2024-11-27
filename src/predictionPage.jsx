import React, { useState, useEffect } from 'react';
import { Card, Select, Space, Spin, Radio } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import * as ML from 'ml-regression';
import { SimpleLinearRegression, PolynomialRegression, ExponentialRegression } from 'ml-regression';

const { Option } = Select;

const PredictionsComponent = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [predictedData, setPredictedData] = useState([]);
    const [selectedMetric, setSelectedMetric] = useState('co2_per_capita');
    const [selectedMethod, setSelectedMethod] = useState('linear');
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

    const predictionMethods = [
        { value: 'linear', label: 'Linear Regression (ML)' },
        { value: 'polynomial', label: 'Polynomial Regression (ML)' },
        { value: 'exponential', label: 'Exponential Regression (ML)' },
        { value: 'power', label: 'Power Regression (ML)' },
        { value: 'sma', label: 'Simple Moving Average' },
        { value: 'ema', label: 'Exponential Moving Average' }
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
    }, [selectedCountry, selectedMetric, selectedContinent, selectedRegion, selectedMethod]);

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

    const loadData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/owid-co2-data.csv');
            const csvText = await response.text();
            const result = Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
            });

            let filteredData;
            if (selectedRegion === 'country') {
                filteredData = result.data
                    .filter(row => row.iso_code === selectedCountry && row[selectedMetric] != null);
            } else {
                filteredData = result.data
                    .filter(row =>
                        row.country === selectedContinent &&
                        !row.iso_code &&
                        row[selectedMetric] != null
                    );
            }

            const processedData = filteredData
                .sort((a, b) => a.year - b.year)
                .slice(-20)
                .map(row => ({
                    year: row.year,
                    value: row[selectedMetric]
                }));

            setData(processedData);
            generatePrediction(processedData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };
    const generatePrediction = (historicalData) => {
        if (!historicalData.length) return;

        const lastYear = historicalData[historicalData.length - 1].year;
        const predictions = [];

        const xValues = historicalData.map((d, i) => i);
        const yValues = historicalData.map(d => d.value);

        try {
            switch (selectedMethod) {
                case 'linear': {
                    const regression = new SimpleLinearRegression(xValues, yValues);
                    for (let i = 1; i <= 5; i++) {
                        predictions.push({
                            year: lastYear + i,
                            predicted: regression.predict(xValues.length + i - 1),
                            type: 'Predicted'
                        });
                    }
                    break;
                }
                case 'polynomial': {
                    const regression = new PolynomialRegression(xValues, yValues, 2);
                    for (let i = 1; i <= 5; i++) {
                        predictions.push({
                            year: lastYear + i,
                            predicted: regression.predict(xValues.length + i - 1),
                            type: 'Predicted'
                        });
                    }
                    break;
                }
                case 'exponential': {
                    // Filter out non-positive values for exponential regression
                    const filteredData = historicalData.filter(d => d.value > 0);
                    const filteredX = filteredData.map((d, i) => i);
                    const filteredY = filteredData.map(d => d.value);
                    const regression = new ExponentialRegression(filteredX, filteredY);

                    for (let i = 1; i <= 5; i++) {
                        predictions.push({
                            year: lastYear + i,
                            predicted: regression.predict(xValues.length + i - 1),
                            type: 'Predicted'
                        });
                    }
                    break;
                }
                case 'power': {
                    const regression = new ML.PowerRegression(xValues, yValues);
                    for (let i = 1; i <= 5; i++) {
                        predictions.push({
                            year: lastYear + i,
                            predicted: regression.predict(xValues.length + i - 1),
                            type: 'Predicted'
                        });
                    }
                    break;
                }
                case 'sma': {
                    const period = 5;
                    const lastValues = historicalData.slice(-period).map(d => d.value);
                    const sma = lastValues.reduce((a, b) => a + b) / period;

                    for (let i = 1; i <= 5; i++) {
                        predictions.push({
                            year: lastYear + i,
                            predicted: sma,
                            type: 'Predicted'
                        });
                    }
                    break;
                }
                case 'ema': {
                    const smoothingFactor = 0.2;
                    let ema = historicalData[0].value;

                    historicalData.forEach(point => {
                        ema = (point.value * smoothingFactor) + (ema * (1 - smoothingFactor));
                    });

                    for (let i = 1; i <= 5; i++) {
                        predictions.push({
                            year: lastYear + i,
                            predicted: ema,
                            type: 'Predicted'
                        });
                    }
                    break;
                }
            }

            const combinedData = [
                ...historicalData.map(d => ({
                    ...d,
                    historical: d.value,
                    type: 'Historical'
                })),
                ...predictions
            ];

            setPredictedData(combinedData);
        } catch (error) {
            console.error('Error in prediction:', error);
        }
    };

    const handleRegionChange = (e) => {
        setSelectedRegion(e.target.value);
        if (e.target.value === 'country') {
            setSelectedCountry('USA');
        } else {
            setSelectedContinent('Asia');
        }
    };

    const COLORS = ['#8884d8', '#82ca9d'];

    return (
        <div className="p-4">
            <Space direction="vertical" size="large" className="w-full">
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Radio.Group value={selectedRegion} onChange={handleRegionChange}>
                        <Radio.Button value="country">Country</Radio.Button>
                        <Radio.Button value="continent">Continent</Radio.Button>
                    </Radio.Group>

                    {selectedRegion === 'country' ? (
                        <Select
                            style={{ width: 300 }}
                            value={selectedCountry}
                            onChange={setSelectedCountry}
                            showSearch
                            optionFilterProp="label"
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {availableCountries.map(country => (
                                <Option
                                    key={country.value}
                                    value={country.value}
                                    label={country.label}
                                >
                                    {country.label}
                                </Option>
                            ))}
                        </Select>
                    ) : (
                        <Select
                            style={{ width: 200 }}
                            value={selectedContinent}
                            onChange={setSelectedContinent}
                            options={continents}
                        />
                    )}

                    <Select
                        style={{ width: 250 }}
                        value={selectedMethod}
                        onChange={setSelectedMethod}
                        options={predictionMethods}
                    />

                    <Select
                        style={{ width: 200 }}
                        value={selectedMetric}
                        onChange={setSelectedMetric}
                        options={metrics}
                    />
                </div>

                <Card title="CO2 Emissions Prediction">
                    {loading ? (
                        <div style={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Spin size="large" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={predictedData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="year"
                                    type="number"
                                    domain={['auto', 'auto']}
                                />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="historical"
                                    stroke={COLORS[0]}
                                    name="Historical Data"
                                    strokeWidth={2}
                                    dot={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="predicted"
                                    stroke={COLORS[1]}
                                    name="Predicted Data"
                                    strokeDasharray="5 5"
                                    strokeWidth={2}
                                    dot={true}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                <Card title="Prediction Details">
                    <p>Region: {selectedRegion === 'country' ?
                        availableCountries.find(c => c.value === selectedCountry)?.label :
                        selectedContinent}
                    </p>
                    <p>Method: {predictionMethods.find(m => m.value === selectedMethod)?.label}</p>
                    <p>Metric: {metrics.find(m => m.value === selectedMetric)?.label}</p>
                    <p>Prediction Range: 5 years</p>
                    <p>Last Historical Value: {data[data.length - 1]?.value?.toFixed(2) || 'N/A'}</p>
                    <p>Predicted Value (5 years): {predictedData[predictedData.length - 1]?.predicted?.toFixed(2) || 'N/A'}</p>
                </Card>
            </Space>
        </div>
    );
};

export default PredictionsComponent;