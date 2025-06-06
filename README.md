# Toronto Pulse 🏙️

A modern, interactive 3D city dashboard for Toronto built with React, TypeScript, and Mapbox GL JS. Toronto Pulse visualizes real-time urban data including public transit, road conditions, bike share availability, and environmental metrics in an immersive 3D interface.

![Toronto Pulse Dashboard](https://img.shields.io/badge/Status-Active-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB) ![Mapbox](https://img.shields.io/badge/Mapbox-000000?logo=mapbox&logoColor=white)

## 🚀 Features

### Real-Time Data Visualization
- **TTC Live Vehicles**: Track buses and streetcars in real-time
- **Road Restrictions**: View current road closures and construction zones
- **Bike Share Stations**: Monitor bike availability across the city
- **Beach Water Quality**: Check environmental conditions at Toronto beaches

### Interactive Experience
- **3D City View**: Immersive 3D perspective with tilt and rotation controls
- **Multi-Mode Dashboard**: Switch between Transit, Infrastructure, Environment, and All Data views
- **Layer Management**: Toggle individual data layers on/off
- **Real-Time Updates**: Automatic data refresh at optimized intervals
- **Click Interactions**: Get detailed information by clicking on map features

### Modern UI/UX
- **Dark Theme**: Sleek, modern interface optimized for data visualization
- **Responsive Design**: Works across desktop and mobile devices
- **Smooth Animations**: Fluid transitions and interactive feedback
- **Accessibility**: Built with accessibility best practices

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript
- **Mapping**: Mapbox GL JS, React Map GL
- **Styling**: Tailwind CSS, Lucide React Icons
- **Data Processing**: Turf.js for geospatial operations
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **Data Sources**: Toronto Open Data Portal, TTC XML API

## 📋 Prerequisites

- Node.js 16+ and npm
- Mapbox access token (free tier available)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/raztronaut/torontopulse.git
   cd torontopulse
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_MAPBOX_TOKEN=your_mapbox_access_token_here
   ```
   
   Get your free Mapbox token at: https://account.mapbox.com/access-tokens/

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🎮 How to Use

### Navigation Controls
- **Zoom**: Mouse wheel or pinch gestures
- **Pan**: Click and drag
- **3D Rotation**: Hold Ctrl/Cmd + drag
- **Tilt**: Hold Shift + drag

### Dashboard Modes
- **Transit**: Focus on public transportation and bike sharing
- **Infrastructure**: View road conditions and construction
- **Environment**: Monitor environmental data like beach water quality
- **All Data**: Display all available layers simultaneously
- **Custom**: Manual layer selection mode

### Layer Controls
- Toggle individual layers using the sidebar controls
- Refresh data manually using the refresh button
- Expand/collapse the control panel for better map viewing

## 🗂️ Project Structure

```
torontopulse/
├── src/
│   ├── components/          # React components
│   ├── config/             # Configuration files (layers, constants)
│   ├── hooks/              # Custom React hooks
│   ├── services/           # Data fetching and processing services
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── index.html              # HTML template
├── package.json            # Dependencies and scripts
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build configuration
```

## 📊 Data Sources

This project integrates data from multiple Toronto city services:

- **Toronto Open Data Portal**: Public datasets including road restrictions, bike share stations, and beach water quality
- **TTC Real-Time Feed**: Live vehicle positions for buses and streetcars
- **Mapbox**: Base map tiles and geospatial services

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Adding New Data Layers

1. Define the layer configuration in `src/config/layers.ts`
2. Create a data service in `src/services/`
3. Add the layer to appropriate dashboard modes
4. Implement the layer visualization in the map component

### Code Style

This project follows modern React and TypeScript best practices:
- Functional components with hooks
- TypeScript strict mode
- ESLint for code quality
- Tailwind CSS for styling
- Responsive design patterns

## 🌟 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **City of Toronto** for providing open data access
- **Toronto Transit Commission (TTC)** for real-time transit feeds
- **Mapbox** for excellent mapping services
- **React and TypeScript communities** for amazing tools and resources

## 📞 Contact

**Project Maintainer**: [@raztronaut](https://github.com/raztronaut)

**Project Link**: [https://github.com/raztronaut/torontopulse](https://github.com/raztronaut/torontopulse)

---

Built with ❤️ in Toronto 🇨🇦 