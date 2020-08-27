
// Get the canvas to draw on
let canvas = document.getElementById("canvas");
let context = canvas.getContext("2d");

let canvasCenterX = canvas.width / 2;
let canvasCenterY = canvas.height / 2;

// Intialize mouse tracking
let mouse = {
    x: undefined,
    y: undefined,
    down: false
}

// Add event listeners to track what the mouse is doing on the canvas
canvas.addEventListener('mousemove',
    function (event) {
        mouse.x = event.x;
        mouse.y = event.y;
    })

canvas.addEventListener('mousedown',
    function (event) {
        mouse.x = event.x;
        mouse.y = event.y;
        mouse.down = true;
    })

canvas.addEventListener('mouseup',
    function (event) {
        mouse.down = false;
    })

canvas.addEventListener('mouseleave',
    function (event) {
        mouse.down = false;
    })

canvas.addEventListener('touchmove',
    function (event) {
        mouse.x = event.touches[0].clientX;
        mouse.y = event.touches[0].clientY;
        event.preventDefault();
    })

canvas.addEventListener('touchstart',
    function (event) {
        mouse.x = event.touches[0].clientX;
        mouse.y = event.touches[0].clientY;
        mouse.down = true;
    })

canvas.addEventListener('touchend',
    function (event) {
        mouse.down = false;
    })

canvas.addEventListener('touchleave',
    function (event) {
        mouse.down = false;
    })


const POLITICAL_ALIGNMENT = {
    YELLOW: { name: "YELLOW", color: "#D9B573", districtColor: "#c89537" },
    PURPLE: { name: "PURPLE", color: "#A66D97", districtColor: "#8b557d" },
    UNALIGNED: { name: 'UNALIGNED', color: "#F2F2F2", districtColor: "#F2F2F2" },
    NONE: { name: 'NONE', color: "#000000", districtColor: "#000000" }
}

const POLITICAL_ALIGNMENT_NUMERIC = {
    0: POLITICAL_ALIGNMENT.YELLOW,
    1: POLITICAL_ALIGNMENT.PURPLE,
    2: POLITICAL_ALIGNMENT.UNALIGNED,
    3: POLITICAL_ALIGNMENT.NONE,
}

const DIRECTION = {
    UP: "UP",
    DOWN: "DOWN",
    LEFT: "LEFT",
    RIGHT: "RIGHT"
}

const DIAGONAL = {
    TOP_LEFT: "TOP_LEFT",
    TOP_RIGHT: "TOP_RIGHT",
    BOTTOM_LEFT: "BOTTOM_LEFT",
    BOTTOM_RIGHT: "BOTTOM_RIGHT"
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

// TODO: Better comment here
// Create a referencable rect object on a canvas
class Neighborhood {
    constructor(xPos, yPos, width, height, politicalAlignment = POLITICAL_ALIGNMENT.NONE, spriteSource = "") {
        this.xPos = xPos;
        this.yPos = yPos;
        this.width = width;
        this.height = height;
        this.filled = false;
        this.selected = false;
        this.color = politicalAlignment.color;
        this.sprite = new Image()
        this.sprite.src = spriteSource;
        this.politicalAlignment = politicalAlignment.name;
        this.districted = false;
        this.winningPoliticalAlignment = POLITICAL_ALIGNMENT.NONE;

        this.districtAdjacencies = []; // What directions are part of the contained district
        this.districtDiagonals = [];

        //this.setRandomPoliticalAlignment();

    }

    setRandomPoliticalAlignment() {
        let possiblePoliticalAlignments = Object.keys(POLITICAL_ALIGNMENT);
        let randomIndex = getRandomInt(possiblePoliticalAlignments.length - 2);

        this.setPoliticalAlignment(possiblePoliticalAlignments[randomIndex]);
    }

    setPoliticalAlignment(politicalAlignment) {
        this.politicalAlignment = politicalAlignment;
        this.color = POLITICAL_ALIGNMENT[this.politicalAlignment].color;
    }

    draw() {
        context.fillStyle = this.color;
        context.strokeStyle = this.color;
        context.fillRect(this.xPos, this.yPos, this.width, this.height);
        context.strokeRect(this.xPos, this.yPos, this.width, this.height);
        //context.drawImage(this.sprite, this.xPos, this.yPos, this.width, this.height);
        context.strokeStyle = "black";

    }
}

// Create the "game" board
class GameBoard {
    constructor(width = 0, height = 0, cellWidth = 100, cellHeight = 100, maxDistrictCount = 0, maxDistrictSize = 0, minDistrictSize = 0, array = []) {
        this.width = width;                     //The number of neighborhoods horizontally
        this.height = height;                   //The number of neighborhoods vertically
        this.cellWidth = cellWidth;             //The size of a neighborhood in pixels horizontally
        this.cellHeight = cellHeight;           //The size of a neighborhood in pixels vertically
        this.cityGrid = [];                     //The grid of neighborhoods used to reference specific neighborhoods
        this.shouldFill = null;
        this.maxDistrictSize = maxDistrictSize; //The number of squares that are changed in a single stroke
        this.minDistrictSize = minDistrictSize;
        this.currentDistrictSize = 0;
        this.districts = [];
        this.maxDistrictCount = maxDistrictCount;
        this.currentDistrict = [];
        this.justDeleted = false;
        this.districtBorderWidth = 7;

        if (array.length == 0) {
            this.createCityGrid();
        } else {
            this.createCityGridByArray(array);
        }

    }

    fillDistrictsByArray(array) {
        for(let i = 0; i < this.maxDistrictCount; i++){
            let currentDistrict = [];
            for(let currentYCell = 0; currentYCell < this.height; currentYCell++){
                for(let currentXCell = 0; currentXCell < this.width; currentXCell++){
                    if(array[currentYCell][currentXCell] == i){
                        currentDistrict.push(this.cityGrid[currentYCell][currentXCell]);
                        this.cityGrid[currentYCell][currentXCell].selected = true;
                    }
                }
            }
            
            this.setAdjacentDirections(currentDistrict);
            this.setDiagonalDirections(currentDistrict);
            this.setWinningDistrictColor(currentDistrict);
            this.districts.push(currentDistrict);
        }
        
    }

    createCityGridByArray(array) {
        this.height = array.length;
        this.width = array[0].length;

        for (let currentYCell = 0; currentYCell < this.height; currentYCell++) {
            let row = [];
            for (let currentXCell = 0; currentXCell < this.width; currentXCell++) {
                row.push(new Neighborhood(
                    currentXCell + currentXCell * this.cellWidth,
                    currentYCell + currentYCell * this.cellHeight,
                    this.cellWidth,
                    this.cellHeight,
                    POLITICAL_ALIGNMENT_NUMERIC[array[currentYCell][currentXCell]]));
            }
            this.cityGrid.push(row);
        }
    }

    createCityGrid() {
        let currentXCell = 0;
        let currentYCell = 0;
        while (currentYCell < this.height) {
            let row = []
            while (currentXCell < this.width) {
                row.push(new Neighborhood(
                    (currentXCell) + (currentXCell * this.cellWidth),
                    (currentYCell) + (currentYCell * this.cellHeight),
                    this.cellWidth,
                    this.cellHeight))
                currentXCell += 1;
            }
            this.cityGrid.push(row);
            currentXCell = 0;
            currentYCell += 1;
        }
    }

    /// TODO: Make this not an abomination to humanity 
    /// TODO: Figure out way to change grid[y][x] to be grid[x][y] for better readability
    // Return the current neighborhood being pointed at by the mouse
    getNeighborhoodByMousePos() {
        let cellCoords = this.getCellsFromPixels(mouse.x, mouse.y);

        return this.getNeighborhood(cellCoords.x, cellCoords.y);
    }

    // Get the neighborhood based on the city grid's cell coordinates
    getNeighborhood(xCell, yCell) {
        if (this.cityGrid[yCell] != null && this.cityGrid[yCell][xCell] != null) {
            return this.cityGrid[yCell][xCell];
        } else {
            return null;
        }

    }

    // Convert canvas coordinates to cell coordinates
    getCellsFromPixels(x, y) {
        let xCell = Math.floor((x) / this.cellWidth);
        let yCell = Math.floor((y) / this.cellHeight);
        return { x: xCell, y: yCell };
    }

    // TODO: Bring those if statements down to more acceptable levels
    // TODO: Split this into multiple methods
    drawDistrict() {
        if (mouse.down && !this.justDeleted) {
            if (this.currentDistrictSize < this.maxDistrictSize) {
                let neighborhood = this.getNeighborhoodByMousePos();
                if (neighborhood != null) {
                    // If neighborhood is not already part of a district, add it to the district being drawn
                    if (!neighborhood.selected) {
                        neighborhood.selected = true;
                        this.currentDistrictSize += 1;
                        this.currentDistrict.push(neighborhood);
                        this.setAdjacentDirections(this.currentDistrict);
                        this.setDiagonalDirections(this.currentDistrict);
                    // If neighborhood is a part of a district, and we aren't currently drawing a district, delete the district
                    } else if (this.currentDistrictSize == 0) {
                        
                        let districtIndex = this.findNeighborhoodsCurrentDistrictIndex(neighborhood);
                        this.deSelectDistrict(this.districts[districtIndex]);
                        this.districts.splice(districtIndex, 1);
                        this.justDeleted = true;
                    }
                }
            }
        }
        else if (!mouse.down) {
            this.justDeleted = false; // The mouse has been brought up, so we no longer just deleted a district
            this.currentDistrictSize = 0;

            // If the selected district is valid, solidify it as an actual district, otherwise deselect it
            if (this.districts.length < this.maxDistrictCount
                && this.currentDistrict.length >= this.minDistrictSize
                && this.isDistrictConnected(this.currentDistrict)) {
                this.districts.push(this.currentDistrict);
                //this.getWinningDistrictColor(this.currentDistrict)
                //console.log(this.getWinningDistrictRatio(this.districts));                    
                this.setWinningDistrictColor(this.currentDistrict);
            } else {
                this.deSelectDistrict(this.currentDistrict);
            }
            this.currentDistrict = [];
        }
    }

    drawCurrentDistrict() {
        this.drawDistrictBorder(this.currentDistrict);
    }

    drawDistrictBorder(district) {
        let prevLineWidth = context.lineWidth;
        let prevStrokeStyle = context.strokeStyle;
        let prevFillStyle = context.fillStyle;

        context.lineWidth = this.districtBorderWidth;
        district.forEach(neighborhood => {
            context.strokeStyle = neighborhood.winningPoliticalAlignment.districtColor;
            context.fillStyle = neighborhood.winningPoliticalAlignment.districtColor;
            this.drawNeighborhoodDistrictBorder(neighborhood.xPos + Math.floor(this.districtBorderWidth / 2),
                neighborhood.yPos + Math.floor(this.districtBorderWidth / 2),
                neighborhood.width - (Math.floor(this.districtBorderWidth / 2) * 2),
                neighborhood.height - (Math.floor(this.districtBorderWidth / 2) * 2),
                this.getSidesToDraw(neighborhood.districtAdjacencies));

            this.drawNeighborhoodDistrictCorners(neighborhood.xPos + Math.floor(this.districtBorderWidth / 2),
                neighborhood.yPos + Math.floor(this.districtBorderWidth / 2),
                neighborhood.width - (Math.floor(this.districtBorderWidth / 2) * 2),
                neighborhood.height - (Math.floor(this.districtBorderWidth / 2) * 2),
                this.getSidesToDraw(neighborhood.districtAdjacencies),
                this.getDiagonalsToDraw(neighborhood.districtDiagonals));
        });
        context.lineWidth = prevLineWidth;
        context.strokeStyle = prevStrokeStyle;
        context.fillStyle = prevFillStyle;
    }

    getSidesToDraw(missingSides) {
        let sidesToDraw = [];
        if (!missingSides.includes(DIRECTION.UP)) {
            sidesToDraw.push(DIRECTION.UP);
        }
        if (!missingSides.includes(DIRECTION.DOWN)) {
            sidesToDraw.push(DIRECTION.DOWN);
        }
        if (!missingSides.includes(DIRECTION.LEFT)) {
            sidesToDraw.push(DIRECTION.LEFT);
        }
        if (!missingSides.includes(DIRECTION.RIGHT)) {
            sidesToDraw.push(DIRECTION.RIGHT);
        }
        return sidesToDraw;
    }

    getDiagonalsToDraw(missingDiagonals) {
        let diagonalsToDraw = [];
        if (!missingDiagonals.includes(DIAGONAL.TOP_RIGHT)) {
            diagonalsToDraw.push(DIAGONAL.TOP_RIGHT);
        }
        if (!missingDiagonals.includes(DIAGONAL.TOP_LEFT)) {
            diagonalsToDraw.push(DIAGONAL.TOP_LEFT);
        }
        if (!missingDiagonals.includes(DIAGONAL.BOTTOM_RIGHT)) {
            diagonalsToDraw.push(DIAGONAL.BOTTOM_RIGHT);
        }
        if (!missingDiagonals.includes(DIAGONAL.BOTTOM_LEFT)) {
            diagonalsToDraw.push(DIAGONAL.BOTTOM_LEFT);
        }
        return diagonalsToDraw;
    }

    drawNeighborhoodDistrictCorners(xPos, yPos, width, height, sides, diagonals) {
        let topLeft = false;
        let topRight = false;
        let botLeft = false;
        let botRight = false;

        sides.forEach(side => {
            switch (side) {
                case DIRECTION.UP:
                    topLeft = true;
                    topRight = true;
                    break;
                case DIRECTION.RIGHT:
                    topRight = true;
                    botRight = true;
                    break;
                case DIRECTION.DOWN:
                    botRight = true;
                    botLeft = true;
                    break;
                case DIRECTION.LEFT:
                    topLeft = true;
                    botLeft = true;
                    break;
                default:
                    break;
            }
        });
        diagonals.forEach(diagonal => {
            switch (diagonal) {
                case DIAGONAL.TOP_RIGHT:
                    topRight = true;
                    break;
                case DIAGONAL.TOP_LEFT:
                    topLeft = true;
                    break;
                case DIAGONAL.BOTTOM_RIGHT:
                    botRight = true;
                    break;
                case DIAGONAL.BOTTOM_LEFT:
                    botLeft = true;
                    break;
                default:
                    break;
            }
        });
        if (topLeft) {
            context.fillRect(xPos - (this.districtBorderWidth / 2), yPos - (this.districtBorderWidth / 2), this.districtBorderWidth, this.districtBorderWidth);
        }
        if (topRight) {
            context.fillRect(xPos - (this.districtBorderWidth / 2) + width, yPos - (this.districtBorderWidth / 2), this.districtBorderWidth, this.districtBorderWidth);
        }
        if (botRight) {
            context.fillRect(xPos - (this.districtBorderWidth / 2) + width, yPos - (this.districtBorderWidth / 2) + height, this.districtBorderWidth, this.districtBorderWidth);
        }
        if (botLeft) {
            context.fillRect(xPos - (this.districtBorderWidth / 2), yPos - (this.districtBorderWidth / 2) + height, this.districtBorderWidth, this.districtBorderWidth);
        }
    }

    drawNeighborhoodDistrictBorder(xPos, yPos, width, height, sides) {
        if (sides.length == 0) {
            return;
        }
        sides.forEach(side => {
            context.beginPath();
            switch (side) {
                case DIRECTION.UP:
                    context.moveTo(xPos - 2, yPos);
                    context.lineTo(xPos + width, yPos);
                    break;
                case DIRECTION.RIGHT:
                    context.moveTo(xPos + width, yPos - 2);
                    context.lineTo(xPos + width, yPos + height);
                    break;
                case DIRECTION.DOWN:
                    context.moveTo(xPos + width + 2, yPos + height);
                    context.lineTo(xPos, yPos + height);
                    break;
                case DIRECTION.LEFT:
                    context.moveTo(xPos, yPos + height + 2);
                    context.lineTo(xPos, yPos);
                    break;
                default:
                    break;
            }
            context.closePath();
            context.stroke();

        });
    }

    fillRectDiagonalLines(xPos, yPos, width, height, lines) {
        let steps = lines / 2;
        let horizontalStep = width / steps;
        let verticalStep = height / steps;

        for (let i = 1; i <= steps; i++) {
            context.beginPath();
            context.moveTo(xPos, yPos + (verticalStep * i));
            context.lineTo(xPos + (horizontalStep * i) - 1, yPos);
            context.stroke();
        }
        for (let j = 1; j <= steps; j++) {
            context.beginPath();
            context.moveTo(xPos + (horizontalStep * j), yPos + height);
            context.lineTo(xPos + width, yPos + (verticalStep * j));
            context.stroke();
        }
    }

    drawDistrictFill(district) {
        let prevStrokeStyle = context.strokeStyle;
        let prevLineWidth = context.lineWidth;
        context.lineWidth = 2;
        district.forEach(neighborhood => {
            if (neighborhood.winningPoliticalAlignment == null) {
                return;
            }
            context.strokeStyle = neighborhood.winningPoliticalAlignment.districtColor;
            this.drawNeighborhoodDistrictFill(neighborhood.xPos, neighborhood.yPos, neighborhood.width, neighborhood.height, 8, neighborhood.districtAdjacencies);
        })
        context.strokeStyle = prevStrokeStyle;
        context.lineWidth = prevLineWidth;
    }

    // TODO: Fix gird alignment due to pixel space between squares
    drawNeighborhoodDistrictFill(xPos, yPos, width, height, lines, sides) {
        let x = xPos;
        let y = yPos;
        let w = width;
        let h = height;
        sides.forEach(side => {
            switch (side) {
                case DIRECTION.UP:
                    // y -= 1;
                    // h += 1;
                    // x += 0.5;
                    // w -= 0.5;
                    break;
                case DIRECTION.RIGHT:
                    //w += 1;
                    break;
                case DIRECTION.DOWN:
                    // h += 1;
                    // x -= 0.5;
                    // w += 0.5;
                    break;
                case DIRECTION.LEFT:
                    // x -= 1;
                    // w += 1;
                    break;
                default:
                    break;
            }

        });
        this.fillRectDiagonalLines(x, y, w, h, lines)
    }

    // Deselect all neighborhoods in a district
    deSelectDistrict(district) {
        district.forEach(neighborhood => {
            neighborhood.selected = false;
            neighborhood.districtAdjacencies = [];
            neighborhood.winningPoliticalAlignment = POLITICAL_ALIGNMENT.NONE;
        });
    }

    // Find which district a neighborhood is in, and return it's index from the districts array
    findNeighborhoodsCurrentDistrictIndex(neighborhood) {
        if (!neighborhood.selected) {
            return null;
        }
        let foundDistrictIndex = null;
        for (let i = 0; i < this.districts.length; i++) {
            if (this.districts[i].includes(neighborhood)) {
                foundDistrictIndex = i;
                break;
            }
        }
        return foundDistrictIndex;
    }

    // Checks whether all selected neighborhoods in a district are all connected to one another
    isDistrictConnected(district) {
        let foundConnectedPairs = 0;
        for (let i = 0; i < district.length; i++) {
            for (let j = i; j < district.length; j++) {
                if (this.areNeighborhoodsAdjacent(district[i], district[j])) {
                    foundConnectedPairs += 1;
                }
            }
        }
        if (foundConnectedPairs >= district.length - 1) {
            return true;
        } else {
            return false;
        }
    }

    areNeighborhoodsDiagonal(firstNeighborhood, secondNeighborhood) {
        let firstNeighborhoodCells = this.getCellsFromPixels(firstNeighborhood.xPos, firstNeighborhood.yPos);
        let secondNeighborhoodCells = this.getCellsFromPixels(secondNeighborhood.xPos, secondNeighborhood.yPos);

        let diff = Math.abs(firstNeighborhoodCells.x - secondNeighborhoodCells.x) + Math.abs(firstNeighborhoodCells.y - secondNeighborhoodCells.y);
        if (diff == 2) {
            return true;
        } else {
            return false;
        }
    }

    // Checks if two neighborhoods are adjacent
    areNeighborhoodsAdjacent(firstNeighborhood, secondNeighborhood) {
        let firstNeighborhoodCells = this.getCellsFromPixels(firstNeighborhood.xPos, firstNeighborhood.yPos);
        let secondNeighborhoodCells = this.getCellsFromPixels(secondNeighborhood.xPos, secondNeighborhood.yPos);

        let diff = Math.abs(firstNeighborhoodCells.x - secondNeighborhoodCells.x) + Math.abs(firstNeighborhoodCells.y - secondNeighborhoodCells.y);
        if (diff == 1) {
            return true;
        } else {
            return false;
        }
    }

    setAdjacentDirections(district) {
        for (let i = 0; i < district.length; i++) {
            district[i].districtAdjacencies = [];
            for (let j = 0; j < district.length; j++) {
                if (this.areNeighborhoodsAdjacent(district[i], district[j])) {
                    if (district[j].xPos > district[i].xPos) {
                        district[i].districtAdjacencies.push(DIRECTION.RIGHT);
                    } else if (district[j].xPos < district[i].xPos) {
                        district[i].districtAdjacencies.push(DIRECTION.LEFT);
                    } else if (district[j].yPos < district[i].yPos) {
                        district[i].districtAdjacencies.push(DIRECTION.UP);
                    } else if (district[j].yPos > district[i].yPos) {
                        district[i].districtAdjacencies.push(DIRECTION.DOWN);
                    }
                }
            }
        }
    }

    setDiagonalDirections(district) {
        for (let i = 0; i < district.length; i++) {
            district[i].districtDiagonals = [];
            for (let j = 0; j < district.length; j++) {
                if (this.areNeighborhoodsDiagonal(district[i], district[j])) {
                    if (district[j].xPos > district[i].xPos && district[j].yPos < district[i].yPos) {
                        district[i].districtDiagonals.push(DIAGONAL.TOP_RIGHT);
                    } else if (district[j].xPos > district[i].xPos && district[j].yPos > district[i].yPos) {
                        district[i].districtDiagonals.push(DIAGONAL.BOTTOM_RIGHT);
                    } else if (district[j].xPos < district[i].xPos && district[j].yPos < district[i].yPos) {
                        district[i].districtDiagonals.push(DIAGONAL.TOP_LEFT);
                    } else if (district[j].xPos < district[i].xPos && district[j].yPos > district[i].yPos) {
                        district[i].districtDiagonals.push(DIAGONAL.BOTTOM_LEFT);
                    }
                }
            }
        }
    }

    setWinningDistrictColor(district) {
        let winningPoliticalAlignment = this.getWinningDistrictColor(district);
        district.forEach(neighborhood => {
            neighborhood.winningPoliticalAlignment = POLITICAL_ALIGNMENT[winningPoliticalAlignment];
        });
    }

    getWinningDistrictColor(district) {
        let counter = {}
        let winner = null;
        district.forEach(neighborhood => {
            counter[neighborhood.politicalAlignment] = ++counter[neighborhood.politicalAlignment] || 1;
        });
        Object.keys(counter).forEach(item => {
            if (counter[item] > counter[winner] || counter[winner] == null) {
                winner = item;
            } else if (counter[item] == counter[winner]) {
                winner = POLITICAL_ALIGNMENT.UNALIGNED.name;
            }
        });
        return winner;
    }

    getWinningDistrictRatio() {
        let counter = {};
        let ratio = {};

        Object.keys(POLITICAL_ALIGNMENT).forEach(alignment => {
            counter[alignment] = 0;
        });

        this.districts.forEach(district => {
            let winningPoliticalAlignment = this.getWinningDistrictColor(district);
            counter[winningPoliticalAlignment] = ++counter[winningPoliticalAlignment] || 1;
        });
        Object.keys(counter).forEach(item => {
            ratio[item] = counter[item] / this.districts.length;
        });
        return ratio;
    }

    getWinningDistrictCount() {
        let counter = {};
        Object.keys(POLITICAL_ALIGNMENT).forEach(alignment => {
            counter[alignment] = 0;
        });

        this.districts.forEach(district => {
            let winningPoliticalAlignment = this.getWinningDistrictColor(district);
            counter[winningPoliticalAlignment] = ++counter[winningPoliticalAlignment] || 1;
        });
        return counter;
    }

    getVoterCounts() {
        let counter = {}
        Object.keys(POLITICAL_ALIGNMENT).forEach(alignment => {
            counter[alignment] = 0;
        });

        this.cityGrid.forEach(row => {
            row.forEach(neighborhood => {
                counter[neighborhood.politicalAlignment] = ++counter[neighborhood.politicalAlignment] || 1;
            });
        });
        return counter;
    }

    // Draw the gameboard
    // TODO rename element and square to more relevant names
    draw() {
        //context.beginPath();
        this.cityGrid.forEach(element => {
            element.forEach(square => {
                square.draw();
            });
        });


        this.districts.forEach(district => {
            this.drawDistrictFill(district);
            this.drawDistrictBorder(district);
        });

    }

    // Update the gameboard, designed to run in a loop
    update() {
        this.drawDistrict();
        this.draw();
        this.drawCurrentDistrict();
    }
}

class MenuElement {
    constructor(name, xPos, yPos, text) {
        this.xPos = xPos;
        this.yPos = yPos;
        this.text = text;
        this.name = name;
    }

    drawElement() {
        let prevFont = context.font;
        let prevFillStyle = context.fillStyle;
        context.fillStyle = "black";

        context.font = "30px Arial";
        context.fillText(this.text, this.xPos, this.yPos);

        context.font = prevFont;
        context.fillStyle = prevFillStyle;
    }
}

class Menu {
    constructor(xPos, yPos, width, height, bgColor = "#000000") {
        this.xPos = xPos;
        this.yPos = yPos;
        this.width = width;
        this.height = height;
        this.bgColor = bgColor;

        this.elements = {};

        this.updateMenu();
    }

    drawMenu(xPos, yPos, width, height, bgColor) {
        let prevFillStyle = context.fillStyle;
        context.fillStyle = bgColor;

        //context.strokeRect(xPos, yPos, width, height);
        context.fillRect(xPos, yPos, width, height);

        Object.keys(this.elements).forEach(key => {
            this.elements[key].drawElement();
        });

        context.fillStyle = prevFillStyle;
    }

    addElement(name, xPos, yPos, text) {
        this.elements[name] = new MenuElement(name, xPos, yPos, text);
    }

    editElement(name, xPos, yPos, text) {
        this.elements[name].xPos = xPos;
        this.elements[name].yPos = yPos;
        this.elements[name].text = text;
    }

    updateMenu() {
        this.drawMenu(this.xPos, this.yPos, this.width, this.height, this.bgColor);
    }
}

class CanvasExplanation {
    constructor(canvas, squareSize = 100, gridArray = [], isThereMenu = false) {
        this.canvas = canvas;
        this.context = canvas.getContext("2d");
        this.context.translate(0.5, 0.5);
        this.squareSize = squareSize;
        this.gridArray = gridArray;
        this.gameBoard = null;
        this.menu = null;
        this.isThereMenu = isThereMenu;

        this.gridWidth = this.gridArray[0].length;
        this.gridHeight = this.gridArray.length;

        this.menuXPos = (this.gridWidth * this.squareSize) + this.gridWidth;
        this.menuYPos = 0;

        this.createGameboard();
        if (this.isThereMenu) {
            this.createMenu();
        }

    }

    createGameboard() {
        let districtSize = this.gridWidth;
        let maxDistrictCount = Math.ceil((this.gridWidth * this.gridHeight) / districtSize);
        this.gameBoard = new GameBoard(this.gridWidth, this.gridHeight, this.squareSize, this.squareSize, maxDistrictCount, districtSize, districtSize, this.gridArray);
    }

    createMenu() {
        let menuWidth = this.canvas.width * 0.25;
        let menuHeight = (this.gridHeight * this.squareSize) + this.gridHeight - 1;

        this.menu = new Menu(this.menuXPos, this.menuYPos, menuWidth, menuHeight, "#F2F2F2");

        let yellowVoterCounts = this.gameBoard.getVoterCounts().YELLOW;
        let purpleVoterCounts = this.gameBoard.getVoterCounts().PURPLE;

        this.menu.addElement("YellowVoterCount", this.menuXPos + 10, this.menuYPos + 30, "Yellow Voters: " + yellowVoterCounts.toString());
        this.menu.addElement("PurpleVoterCount", this.menuXPos + 10, this.menuYPos + 70, "Purple Voters: " + purpleVoterCounts.toString());
        this.menu.addElement("YellowRepresentatives", this.menuXPos + 10, this.menuYPos + 110, "Yellow Representatives: " + this.gameBoard.getWinningDistrictCount().YELLOW);
        this.menu.addElement("PurpleRepresentatives", this.menuXPos + 10, this.menuYPos + 140, "Purple Representatives: " + this.gameBoard.getWinningDistrictCount().PURPLE);

    }

    animate(){
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.gameBoard.update();
        if (this.isThereMenu) {
            this.menu.updateMenu();
            this.menu.editElement("YellowRepresentatives", this.menuXPos + 10, this.menuYPos + 110, "Yellow Representatives: " + this.gameBoard.getWinningDistrictCount().YELLOW);
            this.menu.editElement("PurpleRepresentatives", this.menuXPos + 10, this.menuYPos + 140, "Purple Representatives: " + this.gameBoard.getWinningDistrictCount().PURPLE);
        }

        requestAnimationFrame(this.animate.bind(this));

    }

}