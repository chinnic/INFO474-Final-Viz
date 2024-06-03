const margin = { top: 70, right: 70, bottom: 90, left: 90 };
const width = 1200 - margin.left - margin.right;
const height = 550 - margin.top - margin.bottom;

const svg = d3.select("#visualization")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleBand().range([0, width]).padding(0.1);
const yLeft = d3.scaleLinear().range([height, 0]);
const yRight = d3.scaleLinear().range([height, 0]);

const xAxis = d3.axisBottom(x);
const yAxisLeft = d3.axisLeft(yLeft);
const yAxisRight = d3.axisRight(yRight);

svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
svg.append("g").attr("class", "y-axis-left");
svg.append("g").attr("class", "y-axis-right").attr("transform", `translate(${width},0)`);

// title
svg.append("text")
    .attr("x", width / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .text("Comparing Average Temp and Rainfall Between Cities, July 2014 - June 2015");

// x-axis label
svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 50)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Month");

// left y-axis label
svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Average Temperature (°F)");

// right y-axis label
svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", width + margin.right - 20)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Average Precipitation (cm)");

// legend for the lines and bars
const legendOffsetX = width / 2 - 80;
const legendOffsetY = height + margin.bottom - 25;
const legendLineLength = 30;
const legendBarWidth = 10;
const legendBarHeight = 20;

// temp line legend
svg.append("line")
    .attr("x1", legendOffsetX)
    .attr("y1", legendOffsetY - 5)
    .attr("x2", legendOffsetX + legendLineLength)
    .attr("y2", legendOffsetY - 5)
    .attr("stroke", "black")
    .attr("stroke-width", 2);

// precip bar legend
svg.append("rect")
    .attr("x", legendOffsetX + 9)
    .attr("y", legendOffsetY + 3)
    .attr("width", legendBarWidth)
    .attr("height", legendBarHeight)
    .attr("fill", "black");

// line/bar legend labels
svg.append("text")
    .attr("x", legendOffsetX + legendLineLength + 10)
    .attr("y", legendOffsetY - 4)
    .text("Average Temperature (°F)")
    .style("font-size", "14px")
    .attr("alignment-baseline", "middle");

svg.append("text")
    .attr("x", legendOffsetX + legendBarWidth + 30)
    .attr("y", legendOffsetY + 15)
    .text("Average Precipitation (cm)")
    .style("font-size", "14px")
    .attr("alignment-baseline", "middle");

const parseDate = d3.timeParse("%Y-%m-%d");
const formatMonth = d3.timeFormat("%B, %Y");

const cityFiles = {
    "CLT": "cities/CLT.csv",
    "CQT": "cities/CQT.csv",
    "IND": "cities/IND.csv",
    "JAX": "cities/JAX.csv",
    "MDW": "cities/MDW.csv",
    "PHL": "cities/PHL.csv",
    "PHX": "cities/PHX.csv"
};

function updateData() {
    const selectedCity1 = document.getElementById("city1").value;
    const selectedCity2 = document.getElementById("city2").value;

    if (selectedCity1 === selectedCity2) {
        alert("Please select two different cities to compare, not the same.");
        return;
    }

    const filePaths = [cityFiles[selectedCity1], cityFiles[selectedCity2]];

    Promise.all(filePaths.map(filePath => d3.csv(filePath))).then(dataArrays => {
        const allData = [];
        dataArrays.forEach((data, i) => {
            data.forEach(d => {
                d.date = parseDate(d.date);
                d.actual_mean_temp = +d.actual_mean_temp;
                d.actual_precipitation = +d.actual_precipitation;
            });

            // aggregating average data so it shows by month
            const monthData = d3.groups(data, d => `${d.date.getFullYear()}-${d.date.getMonth()}`)
                .map(([key, values]) => {
                    const [year, month] = key.split('-');
                    return {
                        date: new Date(year, month),
                        avg_temp: d3.mean(values, d => d.actual_mean_temp),
                        avg_precip: d3.mean(values, d => d.actual_precipitation),
                        city: i === 0 ? selectedCity1 : selectedCity2
                    };
                });

            allData.push(...monthData);
        });

        render(allData);
    }).catch(error => {
        console.error('Error loading or processing data:', error);
    });
}

function render(data) {
    svg.selectAll(".bar").remove();
    svg.selectAll(".bar-label").remove();
    svg.selectAll(".line").remove();
    svg.selectAll(".line-outline").remove();
    svg.selectAll(".data-point").remove();
    svg.selectAll(".data-point-outline").remove();
    svg.selectAll(".legend").remove();

    const months = d3.timeMonths(new Date(2014, 6), new Date(2015, 6)); // July 2014 to June 2015

    x.domain(months.map(d => formatMonth(d)));
    yLeft.domain([0, d3.max(data, d => d.avg_temp)]);
    yRight.domain([0, d3.max(data, d => d.avg_precip)]);

    svg.select(".x-axis")
        .transition()
        .duration(1000)
        .call(xAxis);

    svg.select(".y-axis-left")
        .transition()
        .duration(1000)
        .call(yAxisLeft);

    svg.select(".y-axis-right")
        .transition()
        .duration(1000)
        .call(yAxisRight);

    // the bars
    const cities = [...new Set(data.map(d => d.city))];
    const colors = ["steelblue", "orange"];
    const barWidth = x.bandwidth() / cities.length;

    cities.forEach((city, i) => {
        const cityData = data.filter(d => d.city === city);
        svg.selectAll(`.bar-${city}`).data(cityData).enter()
            .append("rect")
            .attr("class", `bar bar-${city}`)
            .merge(svg.selectAll(`.bar-${city}`))
            .transition()
            .duration(1000)
            .attr("x", d => x(formatMonth(d.date)) + i * barWidth)
            .attr("y", d => yRight(d.avg_precip))
            .attr("width", barWidth)
            .attr("height", d => height - yRight(d.avg_precip))
            .attr("fill", colors[i]);

        // the bar labels
        svg.selectAll(`.bar-label-${city}`).data(cityData).enter()
            .append("text")
            .attr("class", `bar-label bar-label-${city}`)
            .merge(svg.selectAll(`.bar-label-${city}`))
            .transition()
            .duration(1000)
            .attr("x", d => x(formatMonth(d.date)) + i * barWidth + barWidth / 2)
            .attr("y", d => yRight(d.avg_precip) - 5)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "black")
            .text(d => d.avg_precip.toFixed(3) + ' cm');
    });

    cities.forEach((city, i) => {
        const cityData = data.filter(d => d.city === city);

        const line = d3.line()
            .x(d => x(formatMonth(d.date)) + barWidth * cities.length / 2)
            .y(d => yLeft(d.avg_temp))
            .curve(d3.curveLinear);

        // the line outline
        svg.selectAll(`.line-outline-${city}`).data([cityData]).enter()
            .append("path")
            .attr("class", `line-outline line-outline-${city}`)
            .merge(svg.selectAll(`.line-outline-${city}`))
            .transition()
            .duration(1000)
            .attr("d", line)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", 5);

        // the actual line
        svg.selectAll(`.line-${city}`).data([cityData]).enter()
            .append("path")
            .attr("class", `line line-${city}`)
            .merge(svg.selectAll(`.line-${city}`))
            .transition()
            .duration(1000)
            .attr("d", line)
            .attr("fill", "none")
            .attr("stroke", colors[i])
            .attr("stroke-width", 3);

        // the data point outlines
        svg.selectAll(`.data-point-outline-${city}`).data(cityData).enter()
            .append("circle")
            .attr("class", `data-point-outline data-point-outline-${city}`)
            .merge(svg.selectAll(`.data-point-outline-${city}`))
            .transition()
            .duration(1000)
            .attr("cx", d => x(formatMonth(d.date)) + barWidth * cities.length / 2)
            .attr("cy", d => yLeft(d.avg_temp))
            .attr("r", 5)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", 2);

        // the actual data points
        svg.selectAll(`.data-point-${city}`).data(cityData).enter()
            .append("circle")
            .attr("class", `data-point data-point-${city}`)
            .merge(svg.selectAll(`.data-point-${city}`))
            .transition()
            .duration(1000)
            .attr("cx", d => x(formatMonth(d.date)) + barWidth * cities.length / 2)
            .attr("cy", d => yLeft(d.avg_temp))
            .attr("r", 5)
            .attr("fill", colors[i]);

        // tooltip
        const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

        svg.selectAll(`.data-point-${city}`)
            .on("mouseover", (event, d) => {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`City: ${d.city}<br>Temperature: ${d.avg_temp.toFixed(2)}°F<br>Precipitation: ${d.avg_precip.toFixed(3)} cm`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition().duration(500).style("opacity", 0);
            });
    });

    // legend
    cities.forEach((city, i) => {
        svg.append("rect")
            .attr("x", width - 100)
            .attr("y", -50 + i * 20)
            .attr("width", 10)
            .attr("height", 10)
            .style("fill", colors[i])
            .attr("class", "legend");

        svg.append("text")
            .attr("x", width - 80)
            .attr("y", -45 + i * 20)
            .attr("dy", ".35em")
            .style("text-anchor", "start")
            .style("font-size", "12px")
            .attr("class", "legend")
            .text(city);
    });
}

document.getElementById("compareButton").addEventListener("click", updateData);

updateData();

