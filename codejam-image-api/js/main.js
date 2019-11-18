

// tools
const TOOLS = {
  BUCKET: 1,
  CHOOSE_COLOR: 2,
  PENCIL: 3,
};
Object.freeze(TOOLS);

// settings
const settings = {
  currentColor: '#000000',
  prevColor: '#000000',
  currentTool: TOOLS.PENCIL,
  drawing: false,
  last_X: 0,
  last_Y: 0,
  canvasSize: 512,
  isCanvasEmpty: false,
};

function getCanvas() {
  return document.querySelector('canvas');
}

// canvas
function getCanvasContext() {
  return getCanvas().getContext('2d');
}

// select element from DOM
function selectElement(elem) {
  return document.querySelector(elem);
}

// save the base64 canvas image to localStorage
function saveCanvasToStorage() {
  localStorage.setItem('canvas', getCanvas().toDataURL());
}

// change current color
function changeColor(color) {
  settings.prevColor = settings.currentColor;
  settings.currentColor = color;
  selectElement('#prev-color').value = selectElement('#current-color').value;
  selectElement('#current-color').value = color;

  localStorage.setItem('prevColor', settings.prevColor);
  localStorage.setItem('currentColor', settings.currentColor);
}

// choose current instrument
function setCurrentTool(num) {
  settings.drawing = false;
  selectElement('#bucket').classList.remove('active');
  selectElement('#choose-color').classList.remove('active');
  selectElement('#pencil').classList.remove('active');

  switch (num) {
    case TOOLS.BUCKET:
      selectElement('#bucket').classList.add('active');
      settings.currentTool = TOOLS.BUCKET;
      localStorage.setItem('currentTool', TOOLS.BUCKET);
      break;

    case TOOLS.CHOOSE_COLOR:
      selectElement('#choose-color').classList.add('active');
      settings.currentTool = TOOLS.CHOOSE_COLOR;
      localStorage.setItem('currentTool', TOOLS.CHOOSE_COLOR);
      break;

    case TOOLS.PENCIL:
      selectElement('#pencil').classList.add('active');
      settings.currentTool = TOOLS.PENCIL;
      localStorage.setItem('currentTool', TOOLS.PENCIL);
      break;

    default:
      throw new Error('Invalid tool!');
  }
}

function plot(ctx, x, y) {
  ctx.rect(x, y, 1, 1);
  ctx.fillStyle = settings.currentColor;
  ctx.fill();
}

// Bresenham's line algorithm
function bresenhamLine(ctx, x0, y0, x1, y1) {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = (x0 < x1) ? 1 : -1;
  const sy = (y0 < y1) ? 1 : -1;
  let err = dx - dy;

  ctx.beginPath();
  while (true) {
    plot(ctx, x, y);

    if ((x === x1) && (y === y1)) {
      break;
    }
    const e2 = 2*err;

    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

// pencil instrument
function pencil(e) {
  if (!settings.drawing) return;
  const ctx = getCanvasContext();
  ctx.imageSmoothingEnabled = false;

  function roundUp(c) {
    return Math.floor(c / (512 / settings.canvasSize));
  }
  settings.lastX = roundUp(settings.lastX);
  settings.lastY = roundUp(settings.lastY);
  const x = roundUp(e.offsetX);
  const y = roundUp(e.offsetY);

  bresenhamLine(ctx, settings.lastX, settings.lastY, x, y);

  [settings.lastX, settings.lastY] = [e.offsetX, e.offsetY];
}

// Paint bucket instrument
function bucket() {
  const ctx = getCanvasContext();

  ctx.fillStyle = settings.currentColor; 
  ctx.fillRect(0, 0, settings.canvasSize, settings.canvasSize);
}

// rgb to hex for <choose color> tool
function rgbToHex(r, g, b) {
  let r1 = r.toString(16);
  let g1 = g.toString(16);
  let b1 = b.toString(16);

  if (r1.length === 1)
    r1 = `0${r1}`;
  if (g1.length === 1)
    g1 = `0${g1}`;
  if (b1.length === 1)
    b1 = `0${b1}`;

  return `#${r1}${g1}${b1}`;
}

// from input text
function getCityName() {
  const city = selectElement('#city-name').value;
  return city;
}

// draw canvas from image file
function drawCanvas(data) {
  const ctx = getCanvasContext();

  const pic = new Image();
  pic.onload = function f() {
    const vRatio =  settings.canvasSize / this.height;
    const hRatio =  settings.canvasSize / this.width;
    const ratio  = Math.min ( vRatio, hRatio );
    const centerShiftX = Math.floor(( settings.canvasSize - this.width*ratio ) / 2);
    const centerShiftY = Math.floor(( settings.canvasSize - this.height*ratio ) / 2);  
    ctx.fillStyle = '#ffffff'; 
    ctx.fillRect(0, 0, settings.canvasSize, settings.canvasSize);
    ctx.drawImage(pic, 0, 0, this.width, this.height,
                      centerShiftX, centerShiftY, this.width*ratio, this.height*ratio);
  }
  pic.src = data;
  pic.crossOrigin="anonymous";
  settings.isCanvasEmpty = false;
  setTimeout(() => {
    saveCanvasToStorage();
  }, 1000);
}

// ----- get image url
async function getLinkToImage() {
  const city = getCityName();
  if (!city) return;
  const clientId = '6d8da586a1fc14b22ef9c8fc66fa97ece139f3454f615c73a375f495151bdda5';

  const url = `https://api.unsplash.com/photos/random?query=town,${city}&client_id=${clientId}`;

  const response = await fetch(url);
  const data = await response.json();
  drawCanvas(`${data.urls.raw}&w=${settings.canvasSize}&dpi=2`);
}

function grayscale() {
  const ctx = getCanvasContext();

  const imageData = ctx.getImageData(0, 0, settings.canvasSize, settings.canvasSize);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i]     = avg; // red
    data[i + 1] = avg; // green
    data[i + 2] = avg; // blue
  }
  ctx.putImageData(imageData, 0, 0);
  setTimeout(() => {
    saveCanvasToStorage();
  }, 300);
}

function changeCanvasSize(size) {
  const ctx = getCanvasContext();

  const image = new Image(settings.canvasSize, settings.canvasSize);
  image.src = getCanvas().toDataURL();
  const ssize = settings.canvasSize;

  settings.canvasSize = +size;
  getCanvas().width = +size;
  getCanvas().height = +size;

  image.onload = function f() {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, ssize, ssize, 0, 0, settings.canvasSize, settings.canvasSize);
  };
  
  setTimeout(() => {
    saveCanvasToStorage();
    localStorage.setItem('canvasSize', size);
  }, 300);
  
}

function getCanvasSizeFromStorage() {
  const item = localStorage.getItem('canvasSize');
  if (item) {
    selectElement('#pixel-size').value = item;
    changeCanvasSize(item);
  } else {
    changeCanvasSize('512');
  }
}

function getCurColorFromStorage() {
  const item = localStorage.getItem('currentColor');
  if (item) {
    selectElement('#current-color').value = item;
    settings.currentColor = item;
  }
}

function getPrevColorFromStorage() {
  const item = localStorage.getItem('prevColor');
  if (item) {
    selectElement('#prev-color').value = item;
    settings.prevColor = item;
  }
}

function getCurToolFromStorage() {
  const item = localStorage.getItem('currentTool');
  if (item) {
    setCurrentTool( +item );
  } else {
    setCurrentTool(settings.currentTool);
  }
}

function getCanvasFromStorage() {
  const base64 = localStorage.getItem('canvas');
  if(!base64) {
    const ctx = getCanvasContext();
    ctx.fillStyle = '#ffffff'; 
    ctx.fillRect(0, 0, settings.canvasSize, settings.canvasSize);
    settings.isCanvasEmpty = true;
    return;
  };

  settings.isCanvasEmpty = false;
  const ctx = getCanvasContext();
  const image = new Image(settings.canvasSize, settings.canvasSize);
  image.src = base64;
  image.onload = function f() {
      ctx.drawImage(image, 0, 0);
  };
}

// get values from localStorage
document.addEventListener('DOMContentLoaded', function f() {
  getCurColorFromStorage();
  getPrevColorFromStorage();
  getCurToolFromStorage();
  getCanvasFromStorage();
  getCanvasSizeFromStorage();
})

// click on canvas
getCanvas().addEventListener('mousedown', (e) => {
  const ctx = getCanvasContext();
  const x = Math.floor(e.offsetX / (512 / settings.canvasSize)); // position canvas
  const y = Math.floor(e.offsetY / (512 / settings.canvasSize)); // position canvas
  const imgData = ctx.getImageData(x, y, 1, 1).data;
  const hex = rgbToHex(imgData[0], imgData[1], imgData[2]);

  switch (settings.currentTool) {
    case TOOLS.BUCKET:
      bucket();
      break;

    case TOOLS.CHOOSE_COLOR:
      changeColor(hex);
      break;

    case TOOLS.PENCIL:
      settings.drawing = true;
      [settings.lastX, settings.lastY] = [e.offsetX, e.offsetY];
      pencil(e);
      settings.isCanvasEmpty = false;
      break;

    default:
      throw new Error('Invalid tool!')
  }
});

getCanvas().addEventListener('mousemove', pencil);

getCanvas().addEventListener('mouseup', () => {
  settings.drawing = false;
  saveCanvasToStorage();
});
getCanvas().addEventListener('mouseout', () => {
  settings.drawing = false;
  saveCanvasToStorage();
});

// click on instruments
selectElement('#bucket').addEventListener('click', () => setCurrentTool(TOOLS.BUCKET));
selectElement('#choose-color').addEventListener('click', () => setCurrentTool(TOOLS.CHOOSE_COLOR));
selectElement('#pencil').addEventListener('click', () => setCurrentTool(TOOLS.PENCIL));

// click on section of colors
selectElement('#prevcolor').addEventListener('click', () => changeColor( selectElement('#prev-color').value ));
selectElement('#red-color').addEventListener('click', () => changeColor('#ff0000'));
selectElement('#blue-color').addEventListener('click', () => changeColor('#0000ff'));

// change color in "current color" instrument
selectElement('#current-color').addEventListener('change', function f(e) {
  this.value = e.target.value;
  settings.currentColor = e.target.value;
  localStorage.setItem('currentColor', e.target.value);
});

// key press listeners
window.addEventListener('keypress', (e) => {
  switch (e.code) {
    case 'KeyB':
      setCurrentTool( TOOLS.BUCKET );
      break;
    case 'KeyC':
      setCurrentTool( TOOLS.CHOOSE_COLOR );
      break;
    case 'KeyP':
      setCurrentTool( TOOLS.PENCIL );
      break;
    default:
  }
});

selectElement('#load-city-image').addEventListener('click', () => {
  getLinkToImage();
});

selectElement('#city-name').addEventListener('keypress', (e) => {
  if (e.keyCode === 13) {
    selectElement('#load-city-image').click();
  }
})

selectElement('#pixel-size').addEventListener('change', function f() {
  changeCanvasSize(this.value);
});

selectElement('#grayscale').addEventListener('click', () => {
  if (settings.isCanvasEmpty) {
    alert('Сначала нужно загрузить изображение!');
    return;
  }
  grayscale();
});
