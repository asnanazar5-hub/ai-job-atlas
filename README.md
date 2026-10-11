# AI Job Atlas

Flask website for exploring AI careers around the world.

## Run
    pip install -r requirements.txt
    python app.py
Open http://127.0.0.1:5000

## Pages
- `/`           Home (animated skill map, links to every section)
- `/finder`     Jobs on the left, your information on the right (separate scrollbars)
- `/countries`  Compare 20 job markets
- `/insights`   Charts for all countries or one country

## Files
- `app.py`            routes, data loading, job search, resume reader
- `templates/`        HTML pages (base.html holds the navbar)
- `static/css/`       style.css
- `static/js/`        main.js, finder.js, countries.js, insights.js
- `static/img/`       SVG illustrations
- `data/`             every .csv in this folder is loaded automatically
