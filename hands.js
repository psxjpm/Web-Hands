const mpHands = window;
const drawingUtils = window;
const controls = window;
const controls3d = window;

// Our input frames will come from here.
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d');
const config = { locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}/${file}`;
    } };
// We'll add this to our control panel later, but we'll save it here so we can
// call tick() each time the graph runs.
const fpsControl = new controls.FPS();

function onResults(results) {
    // Update the frame rate.
    fpsControl.tick();
    // save the state of the canvas
    canvasCtx.save();
    //clear the cavnas of previous drawings
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    //draw the video image
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    //check we have landmarks
    if (results.multiHandLandmarks && results.multiHandedness) {
        //iterate through the found hands
        for (let index = 0; index < results.multiHandLandmarks.length; index++) {
            //classify each of the hands to a type (e.g. left or right hand)
            const classification = results.multiHandedness[index];
            //if it's a right hand make a flag for this
            const isRightHand = classification.label === 'Right';
            //get the set of landmarks for this hand
            const landmarks = results.multiHandLandmarks[index];
            //use the drawingUtils package we imported from mediapipe earlier to draw the connectors between ach of the landmarks
            //we draw the conectors first so that the landmarks overlay them
            //we set the colour as different for left and right hands (green #00FF00 for right and red #FF0000 for left)
            drawingUtils.drawConnectors(canvasCtx, landmarks, mpHands.HAND_CONNECTIONS, { color: isRightHand ? '#00FF00' : '#FF0000' });
            //now we use drawingUtils to draw in the landmarks setting the colours to the reverse of what we used earlier for the fill
            //we can change the radius of the landmarks here as well
            drawingUtils.drawLandmarks(canvasCtx, landmarks, {
                color: isRightHand ? '#00FF00' : '#FF0000',
                fillColor: isRightHand ? '#FF0000' : '#00FF00',
                radius: (data) => {
                    return drawingUtils.lerp(data.from.z, -0.15, .1, 10, 1);
                }
            });
        }
    }
    //new resore the canvas
    canvasCtx.restore();

    //send data from here...

}

//add our hands object and tell it to call onResults() when it gets results
const hands = new mpHands.Hands(config);
hands.onResults(onResults);

//create the new control panel and give it necessary defaut values.
new controls
    .ControlPanel(controlsElement, {
    selfieMode: true,
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
}).add([

    //add the fps controller that we created earlier
    fpsControl,

    //add a toggle for 'selfie mode' - this flips the image like a mirror. We'll default this to 'on'
    new controls.Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),

    //add a camera source picker - this matters if you have multiple cameras. It's a drop down list so creation is a little fiddly
    new controls.SourcePicker({
        onFrame: async (input, size) => {
            const aspect = size.height / size.width;
            let width, height;
            if (window.innerWidth > window.innerHeight) {
                height = window.innerHeight;
                width = height / aspect;
            }
            else {
                width = window.innerWidth;
                height = width * aspect;
            }
            canvasElement.width = width;
            canvasElement.height = height;
            await hands.send({ image: input });
        },
    }),

    //add a slider to set the maximum number of hands to track. We're limiting this to two for this example
    new controls.Slider({
        title: 'Max Number of Hands',
        field: 'maxNumHands',
        range: [1, 2],
        step: 1
    }),
])

    //set the options if any of our controls are changed
    .on(x => {
    const options = x;
    //remember to switch the class of our video element to use the CSS for selfie mode if we toggle that
    videoElement.classList.toggle('selfie', options.selfieMode);
    hands.setOptions(options);
});
