# Attribution / 资源归属

## 团队项目

EZ Bus（2023），UQ DECO3801，**;p Winking Team**。

报告列出的成员：Qiansen Jin、Lihao Zheng、Lei Su、Jiaxiang Liang、Haoran Zheng。
公开材料省略学号和联系方式。Haoran Zheng 为参与成员，不主张完整项目为个人独立作品。

## 原作与发布适配

- `source/` 来源于提供的前后端 ZIP；此次整理进行了 README 所列的复现修复与样例数据清理。
- `docs/assets/original-*.webp` 为原项目报告中的 Dashboard、地图界面截图，保留可见的底图归属。
- `docs/assets/network.json` 来源于提供的道路和线路 CSV，经与原代码一致的经纬度转换得到。
- `docs/` 的独立展示页面、JavaScript 引擎移植、回归测试与发布文档为 2026 年作品集整理时新增。

## 第三方资源

原工程包含或引用的库包括 Flask、Flask-SocketIO、Flask-CORS、Pandas、p5.js、Leaflet、Leaflet.heat、Socket.IO、PapaParse、Chart.js、ECharts、Font Awesome。随源码附带的版权与许可头保留在相应文件中。

原版地图底图为 Esri World Topographic Map，界面中保留 Esri attribution。报告亦将部分图标归于 Freepik / Pixel perfect，以及 Font Awesome；原 `icon/` 文件保留用于复现，不声称为个人原创。

参考出处（来自原报告）：

- Leaflet: https://leafletjs.com/
- Leaflet.heat: https://github.com/Leaflet/Leaflet.heat
- Chart.js: https://www.chartjs.org/
- Font Awesome: https://fontawesome.com/v4/
- p5.js: https://p5js.org/
- Freepik bus icon: https://www.freepik.com/icon/bus_635705
- Freepik chart icon: https://www.freepik.com/icon/bar-graph_404672

第三方资源遵守其各自许可。原团队作品没有在输入材料中提供可确认的统一开放许可，本仓库不代替其他成员授予额外授权。

本次固定的前端依赖：Chart.js 4.4.8、Leaflet 1.9.4、socket.io-client 4.8.1、PapaParse 5.5.3、Leaflet.heat 0.2.0；从 npm 官方 registry 包提取分发文件与对应 LICENSE，位于 source/front end/vendor。
