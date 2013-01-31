var audioContext = null;
var isPlaying = false;		// Are we currently playing?
var startTime;				// The start time of the entire sequence.
var tempo = 120.0;			// tempo (in beats per minute)
var scheduleAheadTime = 50.0;	// How far ahead to schedule audio (in milliseconds)
var noteResolution = 0;		// 0 == 16th, 1 == 8th, 2 == quarter note
var noteLength = 0.05;		// length of "beep" (in seconds)

var canvas,       			// the canvas element
    canvasContext;  		// canvasContext is the canvas' context 2D
var last16thNoteDrawn = -1;	// the last "box" we drew on the screen
var notesInQueue = [];      // the notes that have been put into the web audio,
                            // and may or may not have played yet. {note, time}
var sequenceBar = 0;
var sequenceBeat = 0.0;
var beatsPerBar = 4;
var lastRealTime = 0.0;     // last checkpointed performance.now time
var lastAudioTime = 0.0;    // last checkpointed audioContext time

var nextQuarterBeat;        // What note is currently last scheduled?
var nextQuarterBeatTime = 0.0;     // when the next note is due.

// First, let's shim the requestAnimationFrame API, with a setTimeout fallback
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function( callback ){
        window.setTimeout(callback, 1000 / 60);
    };
})();

/*
function scheduleMetronomeNote( beatNumber, time ) {
    // push the note on the queue, even if we're not playing.
    notesInQueue.push( { note: beatNumber, time: time } );

	if (!( (noteResolution==1) && (beatNumber%2)) // we're not playing non-8th 16th notes
	    && !((noteResolution==2) && (beatNumber%4))) { // we're not playing non-quarter 8th notes
    	// create an oscillator
    	var osc = audioContext.createOscillator();
    	osc.connect( audioContext.destination );
    	if (! (beatNumber % 16) )	// beat 0 == low pitch
    		osc.frequency.value = 220.0;
    	else if (beatNumber % 4)	// quarter notes = medium pitch
    		osc.frequency.value = 440.0;
    	else						// other 16th notes = high pitch
    		osc.frequency.value = 880.0;

        // TODO: Once start()/stop() deploys on Safari and iOS, these should be changed.
    	osc.noteOn( time );
    	osc.noteOff( time + noteLength );
    }

    // Advance current note and time by a 16th note...
    var secondsPerBeat = 60.0 / tempo;  // Notice this picks up the CURRENT 
                                        // tempo value to calculate beat length.
    nextNoteTime += 0.25 * secondsPerBeat;  // Add beat length to last beat time

    current16thNote++;  // Advance the beat number, wrap to zero
    if (current16thNote == 16) {
        current16thNote = 0;
    }
}

function oldscheduleMetronome() {
	// while there are notes that will need to play before the next interval, 
	// schedule them and advance the pointer.
	while (nextNoteTime < audioContext.currentTime + scheduleAheadTime ) {
		scheduleMetronomeNote( current16thNote, nextNoteTime );
	}
}
*/

function scheduleMetronome( realTime, audioTime ) {
    // while there are notes that will need to play before the next interval, 
    // schedule them and advance the pointer.

    console.log( "schedule: real " + realTime + "ms audio: " + audioTime );
    while (nextQuarterBeatTime < realTime + scheduleAheadTime ) {
        if (!( (noteResolution==1) && (nextQuarterBeat%2)) // we're not playing non-8th 16th notes
            && !((noteResolution==2) && (nextQuarterBeat%4))) { // we're not playing non-quarter 8th notes
            // create an oscillator
            var osc = audioContext.createOscillator();
            osc.connect( audioContext.destination );
            if (! (nextQuarterBeat % 16) )   // beat 0 == low pitch
                osc.frequency.value = 220.0;
            else if (nextQuarterBeat % 4)    // quarter notes = medium pitch
                osc.frequency.value = 440.0;
            else                        // other 16th notes = high pitch
                osc.frequency.value = 880.0;

            var startTime = (nextQuarterBeatTime - realTime)/1000.0 + audioTime;
            console.log( "scheduled beat " + nextQuarterBeat + " at " + startTime );
            osc.noteOn( startTime );
            osc.noteOff( startTime + noteLength );
        }


        // Advance current note and time by a quarter beat...
        // Notice this picks up the CURRENT tempo value to calculate beat length.
        nextQuarterBeatTime += 15000.0 / tempo ;  // Add 1/4 beat length to last beat time

        nextQuarterBeat++;  // Advance the beat number, wrap to zero
        if (nextQuarterBeat == beatsPerBar*4) {
            nextQuarterBeat = 0;
        }
    }
}

function startSequence() {
    sequenceBar = 0;
    sequenceBeat = 0.0;
    lastRealTime = window.performance.now();
    lastAudioTime = audioContext.currentTime;
    nextQuarterBeat = 0;
    nextQuarterBeatTime = lastRealTime;
    scheduleMetronome( lastRealTime, lastAudioTime );
}

function updateSequenceTime( time ) {
    var oldTime = lastRealTime;
    lastRealTime = time;
    lastAudioTime = audioContext.currentTime;

    // delta in beats = bpm * delta in min;
    sequenceBeat += (tempo * (lastRealTime - oldTime)) / 60000;
    if ( sequenceBeat > beatsPerBar ) {
        sequenceBeat -= beatsPerBar;
        sequenceBar++;
    }
    scheduleMetronome( time, lastAudioTime );
}

function play() {
	isPlaying = !isPlaying;

	if (isPlaying) { // start playing
		current16thNote = 0;
        lastAudioTime = audioContext.currentTime;
		nextQuarterBeatTime = lastAudioTime;
        startSequence();
//		scheduleMetronome( lastAudioTime );	// kick off scheduling
		return "stop";
	} else {
		return "play";
	}
}

function resetCanvas (e) {
    // resize the canvas - but remember - this clears the canvas too.
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    //make sure we scroll to the top left.
    window.scrollTo(0,0); 
}

function draw( time ) {
    if (isPlaying) {
        updateSequenceTime( time );
    }

    var currentNote = Math.floor(sequenceBeat * 4);
    var centerX = canvas.width/2;
    var centerY = canvas.height/2;

    canvasContext.clearRect(0,0,canvas.width, canvas.height); 

    canvasContext.beginPath();
    canvasContext.arc( centerX, centerY, canvas.height/4, 0, 2*Math.PI, false )
    canvasContext.lineWidth = 20;
    canvasContext.fillStyle = '#aaaaaa';
    canvasContext.fill();

    // line color
    canvasContext.strokeStyle = "gray";
    canvasContext.stroke();

    canvasContext.beginPath();
    canvasContext.arc( centerX, centerY, canvas.height/4 - 20, -0.5*Math.PI, ((sequenceBeat*2/beatsPerBar)-0.5)*Math.PI, false )
    canvasContext.lineWidth = 20;

    // line color
    canvasContext.strokeStyle = "orange";
    canvasContext.stroke();

    canvasContext.beginPath();
    canvasContext.arc( centerX, centerY, canvas.height/4, (currentNote-4)/8*Math.PI, (currentNote-3)/8*Math.PI, false )
    canvasContext.lineWidth = 20;

    // line color
    canvasContext.strokeStyle = currentNote ? ((currentNote%4 == 0)?"blue":"black") : "red";
    canvasContext.stroke();

    canvasContext.font = "18pt 'Monda', sans-serif";
    canvasContext.textAlign = 'center';
    canvasContext.fillStyle = 'black';

    var str = ((sequenceBar<10) ? "000" : ((sequenceBar<100)?"00":((sequenceBar<1000)?"0":""))) + sequenceBar + ":" + sequenceBeat.toFixed(2);
    canvasContext.fillText( str, centerX, centerY-12);

    canvasContext.fillStyle = 'blue';
    str = "tempo: " + ((tempo<10)?"  ":((tempo<100)?" ":"")) + tempo.toFixed(1) + "bpm";
    canvasContext.fillText( str, centerX, centerY+12);
    // set up to draw again
    requestAnimFrame(draw);
}

function keyHandler( ev ) {
    switch (ev.keyCode) {
        case 32:    // spacebar
            play();
            break;
        default:
            return;
    }
    ev.preventDefault();
}

function init(){
    var container = document.createElement( 'div' );

    container.className = "container";
    canvas = document.createElement( 'canvas' );
    canvas.id = "tempoCanvas";
    canvasContext = canvas.getContext( '2d' );
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
    document.body.appendChild( container );
    container.appendChild(canvas);	
    canvasContext.strokeStyle = "#ffffff";  
    canvasContext.lineWidth = 2;

	audioContext = new webkitAudioContext();

	// if we wanted to load audio files, etc., this is where we should do it.

    window.onorientationchange = resetCanvas;
    window.onresize = resetCanvas;

    requestAnimFrame(draw);	// start the drawing loop.
}

window.addEventListener("load", init );
window.addEventListener("keydown", keyHandler, false );

