import React, { useState, useEffect, useRef } from 'react';
import { Card, Space, Select, Spin } from 'antd';
import { Line, Pie } from '@antv/g2plot';
import Papa from 'papaparse';

const CO2Charts = () => {
    const [rawData, setRawData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMetric, setSelectedMetric] = useState('co2_per_capita');
    const lineChartRef = useRef(null);
    const pieChartRef = useRef(null);

    const metrics = [
        { value: 'co2_per_capita', label: 'CO2 per Capita' },
        { value: 'population', label: 'Population' },
        { value: 'gas_co2_per_capita', label: 'Gas CO2 per Capita' },
        { value: 'oil_co2_per_capita', label: 'Oil CO2 per Capita' },
    ];

    const COLORS = [
        '#1890ff',
        '#2fc25b',
        '#facc14',
        '#223273',
        '#8543e0',
        '#13c2c2',
        '#3436c7',
        '#f04864'
    ];

    useEffect(() => {
        const loadCSV = async () => {
            try {
                const response = await fetch('/owid-co2-data.csv');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const csvText = await response.text();

                const result = Papa.parse(csvText, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                });

                setRawData(result.data);
                setLoading(false);
            } catch (error) {
                console.error('Error loading CSV:', error);
                setLoading(false);
            }
        };

        loadCSV();

        // Cleanup function
        return () => {
            if (lineChartRef.current) {
                lineChartRef.current.destroy();
                lineChartRef.current = null;
            }
            if (pieChartRef.current) {
                pieChartRef.current.destroy();
                pieChartRef.current = null;
            }
        };
    }, []);

    const processData = (data, metric) => {
        const countriesData = {};
        data.forEach(row => {
            if (row.iso_code && row[metric] != null) {
                if (!countriesData[row.country]) {
                    countriesData[row.country] = [];
                }
                countriesData[row.country].push({
                    year: row.year,
                    value: row[metric]
                });
            }
        });

        const topCountries = Object.entries(countriesData)
            .map(([country, values]) => ({
                country,
                latestValue: values[values.length - 1]?.value || 0
            }))
            .sort((a, b) => b.latestValue - a.latestValue)
            .slice(0, 20)
            .map(item => item.country);

        const lineData = [];
        topCountries.forEach(country => {
            const countryData = countriesData[country] || [];
            countryData.forEach(d => {
                lineData.push({
                    year: d.year,
                    value: d.value,
                    country: country
                });
            });
        });

        const pieData = topCountries
            .map(country => {
                const countryData = countriesData[country];
                const latestData = countryData[countryData.length - 1];
                return {
                    type: country,
                    value: latestData?.value || 0
                };
            })
            .sort((a, b) => b.value - a.value);

        return { lineData, pieData };
    };

    useEffect(() => {
        if (rawData.length === 0) return;

        const { lineData, pieData } = processData(rawData, selectedMetric);

        const updateCharts = () => {
            // Destroy existing charts before creating new ones
            if (lineChartRef.current) {
                lineChartRef.current.destroy();
            }
            if (pieChartRef.current) {
                pieChartRef.current.destroy();
            }

            // Create new line chart
            const lineConfig = {
                data: lineData,
                xField: 'year',
                yField: 'value',
                seriesField: 'country',
                color: COLORS,
                padding: 'auto',
                xAxis: {
                    type: 'linear',
                    tickCount: 10,
                },
                yAxis: {
                    title: {
                        text: selectedMetric.replace(/_/g, ' ').toUpperCase(),
                    },
                },
                tooltip: {
                    showMarkers: true,
                },
                point: {
                    size: 3,
                    shape: 'circle',
                },
                legend: {
                    position: 'top',
                },
                smooth: true,
                animation: false // Disable animation for better performance
            };

            // Create new pie chart
            const pieConfig = {
                data: pieData,
                angleField: 'value',
                colorField: 'type',
                radius: 0.8,
                color: COLORS,
                label: {
                    type: 'outer',
                    content: '{name}: {percentage}',
                },
                interactions: [
                    { type: 'element-active' },
                ],
                animation: false // Disable animation for better performance
            };

            // Initialize new charts with delay to ensure DOM is ready
            setTimeout(() => {
                if (document.getElementById('lineChart')) {
                    lineChartRef.current = new Line('lineChart', lineConfig);
                    lineChartRef.current.render();
                }
                if (document.getElementById('pieChart')) {
                    pieChartRef.current = new Pie('pieChart', pieConfig);
                    pieChartRef.current.render();
                }
            }, 0);
        };

        updateCharts();
    }, [rawData, selectedMetric]);

    if (loading) {
        return (
            <div style={{
                height: '400px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div style={{ padding: '16px' }}>
                <Select
                    value={selectedMetric}
                    onChange={setSelectedMetric}
                    options={metrics}
                    style={{ width: 200 }}
                />
            </div>
<Space  direction="horizontal" style={{ width: '100%' }} size="large">
            <Card title="CO2 Emissions Over Time" style={{ marginBottom: 16 }}>
                <div id="lineChart" style={{ width: 800 }} />
            </Card>

            <Card title="Distribution Among Top Countries (Latest Year)">
                <div id="pieChart" style={{ height: 400, width: 800 }} />
            </Card>
    </Space>
        </Space>
    );
};

export default CO2Charts;