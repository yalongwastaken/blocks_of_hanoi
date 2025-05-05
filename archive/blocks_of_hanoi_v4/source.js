"use strict";

var canvas;
var gl;

var numVertices = 36;

var pointsArray = [];
var normalsArray = [];
var texCoordsArray = [];

var transformationMatrix;
var transformationMatrixLoc;

// perspective view
var near = 0.3;
var far = 40;
var fovy = 45.0; 
var aspect; 

var eye;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

// lighting
var radius = 20.0;
var theta = 0.0;
var phi = Math.PI / 4;

var lightPosition;
var lightAmbient;
var lightDiffuse;
var lightSpecular;

var materialAmbient;
var materialDiffuse;
var materialSpecular;
var materialShininess;

var ambientProduct;
var diffuseProduct;
var specularProduct;

var ambientColor, diffuseColor, specularColor;
var program;

// used for both lighting and perspective
var mvMatrix, pMatrix;
var modelView, projection;

// vertices for a cube
var vertices = [
   vec4(-0.5, -0.5, 0.5, 1.0), // Vertex 0: Front bottom left
   vec4(-0.5, 0.5, 0.5, 1.0), // Vertex 1: Front top left
   vec4(0.5, 0.5, 0.5, 1.0), // Vertex 2: Front top right
   vec4(0.5, -0.5, 0.5, 1.0), // Vertex 3: Front bottom right
   vec4(-0.5, -0.5, -0.5, 1.0), // Vertex 4: Back bottom left
   vec4(-0.5, 0.5, -0.5, 1.0), // Vertex 5: Back top left
   vec4(0.5, 0.5, -0.5, 1.0), // Vertex 6: Back top right
   vec4(0.5, -0.5, -0.5, 1.0) // Vertex 7: Back bottom right
];

// texture coordinate mapping for the cube
var texCoords = [
   // entire image
   vec2(0, 0),
   vec2(0, 1),
   vec2(1, 1),
   vec2(1, 0),

   // square at 0 0 
   vec2(0, 0),
   vec2(0, 0.25),
   vec2(0.25, 0.25),
   vec2(0.25, 0),

   // square at 1 0 
   vec2(0.25, 0),
   vec2(0.25, 0.25),
   vec2(0.5, 0.25),
   vec2(0.5, 0.0),

   // square at 2 0
   vec2(0.5, 0),
   vec2(0.5, 0.25),
   vec2(0.75, 0.25),
   vec2(0.75, 0),

   // square at 3 0
   vec2(0.75, 0.0),
   vec2(0.75, 0.25),
   vec2(1, 0.25),
   vec2(1, 0.0),

   // square at 0 1 
   vec2(0, 0.25),
   vec2(0, 0.5),
   vec2(0.25, 0.5),
   vec2(0.25, 0.25),

   // square at 1 1
   vec2(0.25, 0.25),
   vec2(0.25, 0.5),
   vec2(0.5, 0.5),
   vec2(0.5, 0.25),

   // square at 2 1
   vec2(0.5, 0.25),
   vec2(0.5, 0.5),
   vec2(0.75, 0.5),
   vec2(0.75, 0.25),

   // square at 3 1
   vec2(0.75, 0.25),
   vec2(0.75, 0.5),
   vec2(1, 0.5),
   vec2(1, 0.25),

   // square at 0 2
   vec2(0, 0.5),
   vec2(0, 0.625),
   vec2(0.25, 0.625),
   vec2(0.25, 0.5),

   // square at 1 2
   vec2(0.25, 0.5),
   vec2(0.25, 0.625),
   vec2(0.5, 0.625),
   vec2(0.5, 0.5),

   // square at 2 2
   vec2(0.5, 0.5),
   vec2(0.5, 0.625),
   vec2(0.75, 0.625),
   vec2(0.75, 0.5),

   // square at 3 2
   vec2(0.75, 0.5),
   vec2(0.75, 0.625),
   vec2(1, 0.625),
   vec2(1, 0.5),

   // square at 0-3 2.5
   vec2(0, 0.625),
   vec2(0, 0.75),
   vec2(0.1, 0.75),
   vec2(0.1, 0.625),
];

// whole cube
function textureCoordMap(w, x, y, z) {
   texCoordsArray.push(texCoords[w]);
   texCoordsArray.push(texCoords[x]);
   texCoordsArray.push(texCoords[y]);
   texCoordsArray.push(texCoords[w]);
   texCoordsArray.push(texCoords[y]);
   texCoordsArray.push(texCoords[z]);
}

// Function to create a quad (rectangle) from four vertices
function quad(a, b, c, d) {
   var t1 = subtract(vertices[b], vertices[a]);
   var t2 = subtract(vertices[c], vertices[b]);
   var normal = cross(t1, t2);
   var normal = vec3(normal);

   // add points, normals, and texture coordinates to the arrays
   pointsArray.push(vertices[a]);
   normalsArray.push(normal);

   pointsArray.push(vertices[b]);
   normalsArray.push(normal);

   pointsArray.push(vertices[c]);
   normalsArray.push(normal);

   pointsArray.push(vertices[a]);
   normalsArray.push(normal);

   pointsArray.push(vertices[c]);
   normalsArray.push(normal);

   pointsArray.push(vertices[d]);
   normalsArray.push(normal);
}

// Function to generate the cube by creating six quads with appropriate vertices
function colorCube() {
   quad(1, 0, 3, 2); // Front face
   quad(2, 3, 7, 6); // Right face
   quad(3, 0, 4, 7); // Bottom face
   quad(6, 5, 1, 2); // Top face
   quad(4, 5, 6, 7); // Back face
   quad(5, 4, 0, 1); // Left face
}

// TRACKBALL LOGIC
var  angle = 0.0;
var  axis = vec3(0, 0, 1);

var 	trackingMouse = false;
var   trackballMove = false;

var lastPos = [0, 0, 0];
var curx, cury;
var startX, startY;

function trackballView( x,  y ) {
   var d, a;
   var v = [];

   v[0] = x;
   v[1] = y;

   d = v[0]*v[0] + v[1]*v[1];
   if (d < 1.0)
     v[2] = Math.sqrt(1.0 - d);
   else {
     v[2] = 0.0;
     a = 1.0 /  Math.sqrt(d);
     v[0] *= a;
     v[1] *= a;
   }
   return v;
}

function mouseMotion( x,  y)
{
   var dx, dy, dz;

   var curPos = trackballView(x, y);
   if(trackingMouse) {
     dx = curPos[0] - lastPos[0];
     dy = curPos[1] - lastPos[1];
     dz = curPos[2] - lastPos[2];

     if (dx || dy || dz) {
         angle = -0.1 * Math.sqrt(dx*dx + dy*dy + dz*dz);


         axis[0] = lastPos[1]*curPos[2] - lastPos[2]*curPos[1];
         axis[1] = lastPos[2]*curPos[0] - lastPos[0]*curPos[2];
         axis[2] = lastPos[0]*curPos[1] - lastPos[1]*curPos[0];

        lastPos[0] = curPos[0];
         lastPos[1] = curPos[1];
         lastPos[2] = curPos[2];
     }
   }
   render();
}

function startMotion( x,  y)
{
    trackingMouse = true;
    startX = x;
    startY = y;
    curx = x;
    cury = y;

    lastPos = trackballView(x, y);
	  trackballMove=true;
}

function stopMotion( x,  y)
{
    trackingMouse = false;
    if (startX != x || startY != y) {
    }
    else {
	     angle = 0.0;
	     trackballMove = false;
    }
}

window.onload = function init() {
   canvas = document.getElementById("gl-canvas");

   gl = WebGLUtils.setupWebGL(canvas);
   if (!gl) {
      alert("WebGL isn't available");
   }

   gl.viewport(0, 0, canvas.width, canvas.height);

   aspect = canvas.width / canvas.height;

   gl.clearColor(1.0, 1.0, 1.0, 1.0);

   gl.enable(gl.DEPTH_TEST);

   //
   //  Load shaders and initialize attribute buffers
   //
   program = initShaders(gl, "vertex-shader", "fragment-shader");
   gl.useProgram(program);

   colorCube();
   startMotion(0.7, 0.7);
   stopMotion(0.7, 0.7);

   var nBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

   var vNormal = gl.getAttribLocation(program, "vNormal");
   gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(vNormal);

   var vBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

   var vPosition = gl.getAttribLocation(program, "vPosition");
   gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(vPosition);

   var tBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

   var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
   gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(vTexCoord);


   transformationMatrixLoc = gl.getUniformLocation(program, "transformationMatrix");

   textureAtlasObject = gl.createTexture();
   gl.bindTexture(gl.TEXTURE_2D, textureAtlasObject);
   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture_atlas);
   gl.generateMipmap(gl.TEXTURE_2D);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

   // TRACKBALL ACTION LISTENERS
   canvas.addEventListener("mousedown", function(event){
      var rect = canvas.getBoundingClientRect();
      var x = 2*(event.clientX-rect.left)/canvas.width-1;
      var y = 2*(canvas.height-(event.clientY-rect.top))/canvas.height-1;
      startMotion(x, y);
    });
    
    canvas.addEventListener("mouseup", function(event){
      var rect = canvas.getBoundingClientRect();
      var x = 2*(event.clientX-rect.left)/canvas.width-1;
      var y = 2*(canvas.height-(event.clientY-rect.top))/canvas.height-1;
      stopMotion(x, y);
    });

    canvas.addEventListener("mousemove", function(event){
      var rect = canvas.getBoundingClientRect();
      var x = 2*(event.clientX-rect.left)/canvas.width-1;
      var y = 2*(canvas.height-(event.clientY-rect.top))/canvas.height-1;
      mouseMotion(x, y);
    });

   // BUTTON ACTION LISTENERS
   document.getElementById("Reset").onclick = function (event) {
      reset();
   };

   document.getElementById("Solve").onclick = function (event) {
      solve();
   };

   document.getElementById("Previous").onclick = function (event) {
      previous();
   };

   animate();
}

// FOR LIGHTING AND CAMERA MOVEMENT
function animate() {
   // Update theta based on time
   theta += (2 * Math.PI) / (500);

   render();
   requestAnimationFrame(animate);
}

// MAIN RENDER FUNCTION
var render = function () {

   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   // LIGHTING
   lightPosition = vec4(2 * radius * Math.sin(theta), 30, radius * Math.cos(theta));
   gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"),
      flatten(lightPosition));

   // SHARED PROPERTIES
   eye = vec3(12 * lastPos[0], 4, 12 * lastPos[2]);
   mvMatrix = lookAt(eye, at, up);
   modelView = mvMatrix;
   pMatrix = perspective(fovy, aspect, near, far);
   projection = pMatrix;

   // SMALLEST PLATE RENDER
   var smallX = getTranslation(pillarAssignments[solutionStep][3])[0];
   var smallY = heightOnPillar[solutionStep][3];
   var smallZ = getTranslation(pillarAssignments[solutionStep][3])[1];
   renderSmall(smallX, smallY, smallZ);

   // SMALLER MIDDLE PLATE RENDER
   var smallmidX = getTranslation(pillarAssignments[solutionStep][2])[0];
   var smallmidY = heightOnPillar[solutionStep][2];
   var smallmidZ = getTranslation(pillarAssignments[solutionStep][2])[1];
   renderSmallMid(smallmidX, smallmidY, smallmidZ);

   // BIGGER MIDDLE PLATE RENDER
   var bigmidX = getTranslation(pillarAssignments[solutionStep][1])[0];
   var bigmidY = heightOnPillar[solutionStep][1];
   var bigmidZ = getTranslation(pillarAssignments[solutionStep][1])[1];
   renderBigMid(bigmidX, bigmidY, bigmidZ);

   //  BIGGEST PLATE RENDER
   var bigX = getTranslation(pillarAssignments[solutionStep][0])[0];
   var bigY = heightOnPillar[solutionStep][0];
   var bigZ = getTranslation(pillarAssignments[solutionStep][0])[1];
   renderLarge(bigX, bigY, bigZ);

   // RENDER PILLARS
   renderPillars();

   // GROUND RENDER
   renderGround();
}

// TEXTURE ATLAS FOR THE CUBES
var texture_atlas = new Image();
texture_atlas.src = "./images/texture_atlas_final.png";

var textureAtlasObject;

// PLATE PROPERTIES

// biggest plate
var big_length = 1;
var big_height = big_length/2;
var big_width = big_length;

// big middle plate
var bigmid_length = 0.8;
var bigmid_height = bigmid_length/2;
var bigmid_width = bigmid_length;

// small middle plate
var smallmid_length = 0.6;
var smallmid_height = smallmid_length/2;
var smallmid_width = smallmid_length;

// smallest plate
var small_length = .4;
var small_height = small_length/2;
var small_width = small_length;

// PROPERTIES NEEDED TO RENDER THE LARGE PLATE
function renderLarge(x, y, z) {
   // light properties
   materialShininess = 100;

   lightAmbient = vec4(0.8, 0.9, 0.8, 1.0);
   lightDiffuse = vec4(.8, .8, .8, 1.0);
   lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

   materialAmbient = vec4(0.9, .7, 0.8, 1.0);
   materialDiffuse = vec4(0.2, 0.2, 0.2, 1.0);
   materialSpecular = vec4(0.8, 0.8, 0.8, 1.0);

   transformationMatrix = mat4(
      big_length, 0.0, 0.0, x,
      0.0, big_height, 0.0, y + big_height / 2,
      0.0, 0.0, big_width, z,
      0.0, 0.0, 0.0, 1.0
   );
   commonShaderConnect();
   textureCoordArrayPush(12, 12, 8, 8);
   gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

// PROPERTIES NEEDED TO RENDER THE LARGER MIDDLE PLATE
function renderBigMid(x, y, z) {
   materialShininess = 100;

   lightAmbient = vec4(0.8, 0.4, 0.8, 1.0);
   lightDiffuse = vec4(.9, .9, .9, 1.0);
   lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

   materialAmbient = vec4(1.0, .4, 1.0, 1.0);
   materialDiffuse = vec4(0.5, 0.5, 0.9, 1.0);
   materialSpecular = vec4(1.0, 1, 1, 1.0);

   transformationMatrix = mat4(
      bigmid_length, 0.0, 0.0, x,
      0.0, bigmid_height, 0.0, y + bigmid_height / 2,
      0.0, 0.0, bigmid_width, z,
      0.0, 0.0, 0.0, 1.0
   );
   commonShaderConnect();
   textureCoordArrayPush(11, 11, 7, 7);
   gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

// PROPERTIES NEEDED TO RENDER THE SMALLER MIDDLE PLATE
function renderSmallMid(x, y, z) {
   materialShininess = 100;

   lightAmbient = vec4(0.35, 0.35, 0.5, 1.0);
   lightDiffuse = vec4(.7, .7, 1, 1.0);
   lightSpecular = vec4(.7, .7, 1.0, 1.0);

   materialAmbient = vec4(.7, 0.7, .7, 1.0);
   materialDiffuse = vec4(.7, 0.7, 0.4, 1.0);
   materialSpecular = vec4(1, 0.1, 1.0, 1.0);

   transformationMatrix = mat4(
      smallmid_length, 0.0, 0.0, x,
      0.0, smallmid_height, 0.0, y + smallmid_height / 2,
      0.0, 0.0, smallmid_width, z,
      0.0, 0.0, 0.0, 1.0
   );
   commonShaderConnect();
   textureCoordArrayPush(9, 9, 3, 3);
   gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

// PROPERTIES NEEDED TO RENDER THE SMALLEST PLATE
function renderSmall(x, y, z) {
   materialShininess = 100;

   lightAmbient = vec4(0.8, 0.4, 0.8, 1.0);
   lightDiffuse = vec4(.9, .9, .9, 1.0);
   lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

   materialAmbient = vec4(1.0, .4, 1.0, 1.0);
   materialDiffuse = vec4(0.5, 0.5, 0.9, 1.0);
   materialSpecular = vec4(1.0, 1, 1, 1.0);

   transformationMatrix = mat4(
      small_length, 0.0, 0.0, x,
      0.0, small_height, 0.0, y + small_height / 2,
      0.0, 0.0, small_width, z,
      0.0, 0.0, 0.0, 1.0
   );
   commonShaderConnect();
   textureCoordArrayPush(10, 10, 4, 4);
   gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

// GROUND LOGIC AND TRANSFORMATIONS
function renderGround() {
   // ground properties
   var ground_length = 6 * big_length;
   var ground_height = 6 * big_length;
   var ground_width = 6 * big_length;

   materialShininess = 100;

   lightAmbient = vec4(1, 1, 1, 1.0);
   lightDiffuse = vec4(0.9, 0.9, 0.9, 1.0);
   lightSpecular = vec4(1, 1, 1, 1.0);

   materialAmbient = vec4(0.65, 0.65, 0.65, 1.0);
   materialDiffuse = vec4(0.3, 0.2, 0.3, 1.0);
   materialSpecular = vec4(.5, 0.5, .5, 1.0);

   transformationMatrix = mat4(
      ground_length, 0.0, 0.0, 0,
      0.0, ground_height, 0.0, -ground_height / 2,
      0.0, 0.0, ground_width, 0,
      0.0, 0.0, 0.0, 1.0
   );

   commonShaderConnect();
   textureCoordArrayPush(5, 1, 6, 4);
   gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

// PILLAR LOGIC AND TRANSFORMATIONS
function renderPillars() {
   // shared pillar properties
   var pillar_length = 0.13;
   var pillar_height = 1.5;
   var pillar_width = 0.13;

   materialShininess = 100;

   lightAmbient = vec4(1, 1, 1, 1.0);
   lightDiffuse = vec4(0.9, 0.9, 0.9, 1.0);
   lightSpecular = vec4(1, 1, 1, 1.0);

   materialAmbient = vec4(0.65, 0.65, 0.65, 1.0);
   materialDiffuse = vec4(0.4, 0.3, 0.4, 1.0);
   materialSpecular = vec4(.6, 0.6, .6, 1.0);

   textureCoordArrayPush(13, 13, 2, 2);
   
   // middle pillar
   transformationMatrix = mat4(
      pillar_length, 0.0, 0.0, 0,
      0.0, pillar_height, 0.0, pillar_height / 2,
      0.0, 0.0, pillar_width, 0,
      0.0, 0.0, 0.0, 1.0
   );
   commonShaderConnect();
   gl.drawArrays(gl.TRIANGLES, 0, numVertices);

   // left pillar
   transformationMatrix = mat4(
      pillar_length, 0.0, 0.0, big_length + big_length / 4,
      0.0, pillar_height, 0.0, pillar_height / 2,
      0.0, 0.0, pillar_width, big_length + big_length / 4,
      0.0, 0.0, 0.0, 1.0
   );
   commonShaderConnect();
   gl.drawArrays(gl.TRIANGLES, 0, numVertices);

   // right pillar
   transformationMatrix = mat4(
      pillar_length, 0.0, 0.0, -big_length - big_length / 4,
      0.0, pillar_height, 0.0, pillar_height / 2,
      0.0, 0.0, pillar_width, -big_width - big_width / 4,
      0.0, 0.0, 0.0, 1.0
   );
   commonShaderConnect();
   gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

// COMMON FUNCTION FOR SENDING INFORMATION TO THE SHADERS
function commonShaderConnect() {
   ambientProduct = mult(lightAmbient, materialAmbient);
   diffuseProduct = mult(lightDiffuse, materialDiffuse);
   specularProduct = mult(lightSpecular, materialSpecular);

   gl.uniform1f(gl.getUniformLocation(program,
      "shininess"), materialShininess);
   gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),
      flatten(ambientProduct));
   gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),
      flatten(diffuseProduct));
   gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"),
      flatten(specularProduct));

   gl.uniformMatrix4fv(transformationMatrixLoc, false, flatten(transformationMatrix));

   gl.uniformMatrix4fv(gl.getUniformLocation(program,
      "modelViewMatrix"), false, flatten(modelView));

   gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"),
      false, flatten(projection));
}

// x = front and back; y = side; z = top; w = bottom
function textureCoordArrayPush(x, y, z, w) {
   texCoordsArray = [];
   textureCoordMap(0+4*x, 1+4*x, 2+4*x, 3+4*x);
   textureCoordMap(0+4*y, 1+4*y, 2+4*y, 3+4*y);
   textureCoordMap(0+4*w, 1+4*w, 2+4*w, 3+4*w);
   textureCoordMap(0+4*z, 1+4*z, 2+4*z, 3+4*z);
   textureCoordMap(0+4*x, 1+4*x, 2+4*x, 3+4*x);
   textureCoordMap(0+4*y, 1+4*y, 2+4*y, 3+4*y);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);
   texCoordsArray = [];
}

// TOWERS OF HANOI LOGIC
var solutionStep = 0;

// 0 = middle pilar
// 1 = left pillar
// 2 = right pillar
// indices: 0 = biggest, 1 = bigmid, 2 = smallbig, 3 = smallest
var pillarAssignments = [
   [0, 0, 0, 0], // step 0 basis
   [0, 0, 0, 1], // step 1
   [0, 0, 2, 1], // step 2
   [0, 0, 2, 2], // step 3
   [0, 1, 2, 2], // step 4
   [0, 1, 2, 0], // step 5
   [0, 1, 1, 0], // step 6
   [0, 1, 1, 1], // step 7
   [2, 1, 1, 1], // step 8
   [2, 1, 1, 2], // step 9
   [2, 1, 0, 2], // step 10
   [2, 1, 0, 0], // step 11
   [2, 2, 0, 0], // step 12
   [2, 2, 0, 1], // step 13
   [2, 2, 2, 1], // step 14
   [2, 2, 2, 2], // step 15
];

function getTranslation(pillar) {
   var x = 0;
   var z = 0;
   if (pillar == 1) {
      x = big_length + big_length / 4;
      z = big_length + big_length / 4;
   } else if (pillar == 2) {
      x = -big_length - big_length / 4;
      z = -big_length - big_length / 4;
   }

   return [x, z];
}

// indices: 0 = biggest, 1 = bigmid, 2 = smallmid, 3 = smallest
// values: 0 = bottom, 1 = second to bottom, etc.
// height values: big = 0.75, bigmid = 0.625, smallmid = 0.5, small = 0.375
var heightOnPillar = [
   [0, big_height, big_height+bigmid_height, big_height+bigmid_height+smallmid_height],
   [0, big_height, big_height+bigmid_height, 0],
   [0, big_height, 0, 0],
   [0, big_height, 0, smallmid_height],
   [0, 0, 0, smallmid_height],
   [0, 0, 0, big_height],
   [0, 0, bigmid_height, big_height],
   [0, 0, bigmid_height, bigmid_height+smallmid_height],
   [0, 0, bigmid_height, bigmid_height+smallmid_height],
   [0, 0, bigmid_height, big_height],
   [0, 0, 0, big_height],
   [0, 0, 0, smallmid_height],
   [0, big_height, 0, smallmid_height],
   [0, big_height, 0, 0],
   [0, big_height, big_height+bigmid_height, 0],
   [0, big_height, big_height+bigmid_height, big_height+bigmid_height+smallmid_height],
];

function reset() {
   solutionStep = 0;
   render();
}

function solve() {
   if (solutionStep == 15) {

   } else {
      solutionStep = solutionStep + 1;
      render();
   }
}

function previous() {
   if (solutionStep == 0) {

   } else {
      solutionStep = solutionStep - 1;
      render();
   }
}