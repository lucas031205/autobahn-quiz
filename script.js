const map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [14.1, 47.6],
    zoom: 6.8
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

let roads = [];
const guessedRoads = new Set();

const input = document.getElementById("answerInput");
const button = document.getElementById("submitButton");
const foundCount = document.getElementById("foundCount");
const totalCount = document.getElementById("totalCount");
const message = document.getElementById("message");

function normalize(text) {
    return text
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
}

async function loadRoads() {

    message.textContent = "Lade Straßendaten...";

    try {

        const response = await fetch("roads.json");

        if (!response.ok) {
            throw new Error("roads.json konnte nicht geladen werden");
        }

        roads = await response.json();

        console.log("Straßen geladen:", roads);

        totalCount.textContent = roads.length;

        drawRoads();

        message.textContent =
            roads.length + " Straßen geladen.";

    } catch (error) {

        console.error(error);

        message.textContent =
            "Fehler: " + error.message;

        message.className = "error";
    }
}

function drawRoads() {

    if (!map.isStyleLoaded()) {
        return;
    }

    if (map.getLayer("quiz-roads-fill")) {
        map.removeLayer("quiz-roads-fill");
    }

    if (map.getLayer("quiz-roads-outline")) {
        map.removeLayer("quiz-roads-outline");
    }

    if (map.getSource("quiz-roads")) {
        map.removeSource("quiz-roads");
    }

    const features = [];

    for (const road of roads) {

        const guessed = guessedRoads.has(road.ref);

        for (const part of road.parts) {

            if (!part || part.length < 2) {
                continue;
            }

            features.push({
                type: "Feature",
                properties: {
                    ref: road.ref,
                    name: road.name || "",
                    guessed: guessed
                },
                geometry: {
                    type: "LineString",
                    coordinates: part
                }
            });
        }
    }

    map.addSource("quiz-roads", {
        type: "geojson",
        data: {
            type: "FeatureCollection",
            features: features
        }
    });

    // Roter Außenrand
    map.addLayer({
        id: "quiz-roads-outline",
        type: "line",
        source: "quiz-roads",

        layout: {
            "line-cap": "round",
            "line-join": "round"
        },

        paint: {
            "line-color": "#e00000",
            "line-width": 8
        }
    });

    // Weiß innen / Rot wenn gefunden
    map.addLayer({
        id: "quiz-roads-fill",
        type: "line",
        source: "quiz-roads",

        layout: {
            "line-cap": "round",
            "line-join": "round"
        },

        paint: {
            "line-color": [
                "case",
                ["==", ["get", "guessed"], true],
                "#e00000",
                "#ffffff"
            ],

            "line-width": [
                "case",
                ["==", ["get", "guessed"], true],
                6,
                4
            ]
        }
    });
}
function checkAnswer() {

    const answer = normalize(input.value);

    if (!answer) {
        return;
    }

    let foundRoad = null;

    for (const road of roads) {

        const correctAnswer = normalize(
            road.ref + " " + (road.name || "")
        );

        if (answer === correctAnswer) {
            foundRoad = road;
            break;
        }
    }

    if (!foundRoad) {

        message.textContent = "❌ Falsch";
        message.className = "error";

        return;
    }

    if (guessedRoads.has(foundRoad.ref)) {

        message.textContent =
            "Diese Straße hast du bereits.";

        message.className = "error";

        return;
    }

    guessedRoads.add(foundRoad.ref);

    foundCount.textContent = guessedRoads.size;

    drawRoads();

    message.textContent =
        "✓ " + foundRoad.ref + " " + foundRoad.name;

    message.className = "success";

    input.value = "";
    input.focus();
}

button.addEventListener("click", checkAnswer);

input.addEventListener("keydown", event => {

    if (event.key === "Enter") {
        checkAnswer();
    }

});

map.on("load", () => {
    loadRoads();
});