import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu, Typography } from 'antd';
import { GlobalOutlined, LineChartOutlined, RiseOutlined } from '@ant-design/icons';
import WorldMapVisualization from "./worldmap";
import CO2Charts from "./graph_pie";
import TrendsAndComparisons from "./trends";
import PredictionsComponent from "./predictionPage";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const MapPage = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>Global CO2 Emissions</Title>
            <Text type="secondary">Interactive world map showing emissions by country</Text>
        </div>
        <CO2Charts />
        <WorldMapVisualization />
    </div>
);

const PredictionsPage = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>Emissions Predictions</Title>
            <Text type="secondary">3-month forecast using various prediction methods</Text>
        </div>
        <div style={{ width: '100%', minHeight: 'calc(100vh-250px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: '8px', marginTop: '16px' }}>
            <PredictionsComponent/>
        </div>
    </div>
);

const TrendsPage = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>Emissions Trends</Title>
            <Text type="secondary">Historical trends and analysis</Text>
        </div>
        <TrendsAndComparisons/>
    </div>
);

const Dashboard = () => {
    const menuItems = [
        {
            key: '/',
            icon: <GlobalOutlined />,
            label: <Link to="/">World Map</Link>,
        },
        {
            key: '/predictions',
            icon: <RiseOutlined />,
            label: <Link to="/predictions">Predictions</Link>,
        },
        {
            key: '/trends',
            icon: <LineChartOutlined />,
            label: <Link to="/trends">Trends</Link>,
        },
    ];

    return (
        <BrowserRouter>
            <Layout>
                <Header style={{ background: '#fff', padding: '0 16px' }}>
                    <Menu
                        mode="horizontal"
                        items={menuItems}
                        selectedKeys={[window.location.pathname]}
                        style={{ border: 'none' }}
                    />
                </Header>
                <Content style={{ height: '100vh', background: '#f5f5f5', padding: '16px' }}>
                    <Routes>
                        <Route path="/" element={<MapPage />} />
                        <Route path="/predictions" element={<PredictionsPage />} />
                        <Route path="/trends" element={<TrendsPage />} />
                    </Routes>
                </Content>
            </Layout>
        </BrowserRouter>
    );
};

export default Dashboard;