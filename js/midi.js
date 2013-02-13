function midiMessageReceived( ev ) {
  if (ev.data.length != 3)
    return;

  var cmd = ev.data[0] >> 4;
  var channel = ev.data[0] & 0xf;
  var noteNumber = ev.data[1];
  var velocity = ev.data[2];

  if ( cmd==8 || ((cmd==9)&&(velocity==0)) ) { // with MIDI, note on with velocity zero is the same as note off
    // note off
    noteOff( noteNumber );
  } else if (cmd == 9) {
    // note on
    noteOn( noteNumber, velocity);
  } else if (cmd == 11) {
    controller( noteNumber, velocity);
  }
}

var selectMIDIIn = null;
var selectMIDIOut = null;
var midiAccess = null;
var midiIn = null;
var midiOut = null;

function changeMIDIIn( ev ) {
  var list=midiAccess.getInputs();
  var selectedIndex = ev.target.selectedIndex;

  if (list.length >= selectedIndex) {
    midiIn = midiAccess.getInput( list[selectedIndex] );
    midiIn.onmessage = midiMessageReceived;
  }
}

function changeMIDIOut( ev ) {
  var list=midiAccess.getOutputs();
  var selectedIndex = ev.target.selectedIndex;

  if (list.length >= selectedIndex)
    midiOut = midiAccess.getOutput( list[selectedIndex] );
}

function onMIDIInit( midi ) {
  var preferredIndex = 0;
  midiAccess = midi;
  selectMIDIIn=document.getElementById("midiIn");
  selectMIDIOut=document.getElementById("midiOut");

  var list=midi.getInputs();

  // clear the MIDI input select
  selectMIDIIn.options.length = 0;

  for (var i=0; i<list.length; i++)
    if (list[i].name.toString().indexOf("Controls") != -1)
      preferredIndex = i;

  if (list.length) {
    for (var i=0; i<list.length; i++)
      selectMIDIIn.options[i]=new Option(list[i].name,list[i].fingerprint,i==preferredIndex,i==preferredIndex);

    midiIn = midiAccess.getInput( list[preferredIndex] );
    midiIn.addEventListener( "message", midiMessageReceived );

    selectMIDIIn.onchange = changeMIDIIn;
  }

  // clear the MIDI output select
  selectMIDIOut.options.length = 0;
  preferredIndex = 0;
  list=midi.getOutputs();

  for (var i=0; i<list.length; i++)
    if (list[i].name.toString().indexOf("Controls") != -1)
      preferredIndex = i;

  if (list.length) {
    for (var i=0; i<list.length; i++)
      selectMIDIOut.options[i]=new Option(list[i].name,list[i].fingerprint,i==preferredIndex,i==preferredIndex);

    midiOut = midiAccess.getOutput( list[preferredIndex] );
    selectMIDIOut.onchange = changeMIDIOut;
  }
}

function onMIDISystemError( msg ) {
  console.log( "Error encountered:" + msg );
}
//init: start up MIDI
window.addEventListener('load', function() {   
  navigator.requestMIDIAccess( onMIDIInit, onMIDISystemError );
});

function noteOn( noteNumber, velocity) {
  if (isRecordingMIDI) {
    updateSequenceTime( window.performance.now());
    console.log("note on at " +sequenceBar + ":" + sequenceBeat);
    if ((beatsPerBar - sequenceBeat) < 0.02) {
      console.log("adjusting note");
      midiBeat = 0.0;
    } else
      midiBeat = sequenceBeat;

    // todo: should really be an insert
    // todo: should keep active notes, and push length in here.
    midiNotesRecorded.push( { time: midiBeat, note:(noteNumber+32), velocity: velocity, played: true });
  }
  if (midiOut)
    midiOut.send([0x99,noteNumber+32, velocity]);
}

function noteOff( noteNumber ) {
  if (midiOut)
    midiOut.send([0x89,noteNumber+32, 65 ]);
}

function controller(number, data) {
  switch (number) {
  }
}