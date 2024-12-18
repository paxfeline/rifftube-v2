import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { connect } from 'react-redux';

import RiffList from './RiffList.jsx';
import Login from '../Login/Login.jsx';

import { setRifferName, togglePlayerMode, setRecorder,
  saveNewRiff, saveEditRiff, setVideoID, getAllRiffs, getMyRiffs } from '../../actions/index.js';

import { executeScriptElements, extractVideoID, riffFD2Obj } from './util.js';

/*This component houses all of the riff buttons and the rifflist*/
function EditControls(props)
{
  let templateRef = React.useRef(null);
  const navigate = useNavigate();

  // enforce focus on body
  useEffect( () =>
  {
    const body = document.body;
    body.setAttribute("tabIndex", 1);
    function resetFocus()
    {
      // allow focus to leave the body if not logged in
      if (!props.loggedIn) return;

      // allow focus to leave the body if editing dialog is open
      if (document.querySelector('.rifftube-riff-edit-dialog')) return;


      // I hate this use of timeout so. much.
      // but it seems necessary
      setTimeout( () =>
      {
        body.focus();
        console.log("reset focus", document.activeElement);
        // this seems to be unnecessary, but who knows!?
        if (document.activeElement !== body)
          setTimeout(resetFocus, 10);
      }, 10 );
    }
    body.addEventListener("blur", resetFocus);

    return ( () => body.removeEventListener("blur", resetFocus) );
  }, [])

  let cancelHandler = e => { console.log("dial cancel"); closeDial(); e.preventDefault(); };

  // get user permission to record and save mediaRecorder object
  useEffect( () =>
  {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        let mediaRecorder = new MediaRecorder(stream);
        props.setRecorder(mediaRecorder);
      });
  }, []);

  // useCallback because the values of recorder and rifftubePlayer can change
  let keydown = useCallback( (e) =>
    {
      // ignore if not logged in
      if (!props.loggedIn || !props.confirmed) return;

      // ignore if the edit dialog is open
      if (document.querySelector('.rifftube-riff-edit-dialog')) return;

      let startNewRiff = (immediateRecord) =>
      {
        let td = templateRef.current.content.firstChild.cloneNode(true);
        td.id = "rifftube-edit-dialog";
        document.body.append(td);
        console.log("set cur dial", td);
        td.showModal();

        let et = td.firstElementChild;

        // set up recorder and start time
        let set_recorder_event = new CustomEvent("rifftube:riff:edit:setup:recorder",
        {
          detail: { recorder: props.recorder }
        });
        et.dispatchEvent(set_recorder_event);

        let set_anim_event = new CustomEvent("rifftube:riff:edit:setup:anim");
        et.dispatchEvent(set_anim_event);

        let set_start_event = new CustomEvent("rifftube:riff:edit:setup:start",
        {
          detail: { start: props.rifftubePlayer?.getCurrentTime?.() || 0 }
        });
        et.dispatchEvent(set_start_event);

        let immediate_start_event = new CustomEvent("rifftube:riff:edit:start",
        {
          detail: { type: immediateRecord }
        });
        et.dispatchEvent(immediate_start_event);

        td.addEventListener('cancel', cancelHandler, false);

        //console.log('dispatched', set_recorder_event, set_start_event);
      }
      
      /*
      console.log('kd meta count', e.getModifierState("Control") ||
        e.getModifierState("Alt") ||
        e.getModifierState("Meta"));
        */

      if ( e.getModifierState("Control") ||
              e.getModifierState("Alt") ||
              e.getModifierState("Meta") )
          return;

      if (e.key == 'r' || e.key == 't')
      {
        // immediate record if pressing r but not t
        startNewRiff(e.key);
      }
    },
    [props.recorder, props.rifftubePlayer, props.loggedIn, props.confirmed] );

  function closeDial()
  {
    let dial = document.querySelector('#rifftube-edit-dialog');
    dial.close();
    dial.remove();
  }

  function saveRiff({ detail })
  {
    // detail is FormData
    console.log( "sr", detail );

    let riff = riffFD2Obj(detail);

    // mark as unsaved
    riff.unsaved = true;

      //...action.payload,
    //delete riff.payload;
    
    if ( riff.id )
    {
      props.saveEditRiff(detail, riff);
    }
    else
    {
      props.saveNewRiff(detail, riff);
    }

    closeDial();
  }

  
  useEffect(() =>
  {
    document.addEventListener('rifftube:riff:edit:save', saveRiff, false);
    document.addEventListener('rifftube:riff:edit:close', closeDial, false);

    return () =>
    {
      document.removeEventListener('rifftube:riff:edit:save', saveRiff, false);
      document.removeEventListener('rifftube:riff:edit:close', closeDial, false);
    }
  }, []);

  useEffect(() =>
  {
    document.addEventListener('keydown', keydown, false);

    return () =>
    {
      document.removeEventListener('keydown', keydown, false);
    }
  }, [keydown]);

  
  
  useEffect(() =>
  {
    if (props.loggedIn && props.confirmed)
    {
      /*
      let newRiffDialog = document.createElement("dialog");
      templateRef.current.content.append(newRiffDialog);
      let newRiffFrame = document.createElement("iframe");
      newRiffFrame.setAttribute("allow", "microphone");
      newRiffDialog.append(newRiffFrame);
      newRiffFrame.src = `${baseURL2}/riffs/new?video_id=${props.videoID}`;
      */
      
      fetch(`/riffs/new?video_id=${props.videoID}`)
        .then(response => response.text())
        .then(text =>
          {
            let dial = document.createElement("dialog");
            dial.innerHTML = text;
            let el = templateRef.current;
            el.content.replaceChildren(dial);
            executeScriptElements(dial);
          });
          
    }
  }, [props.videoID, props.loggedIn, props.confirmed]);


    /*
    const blurEvent = () =>
    {
      setTimeout(() => {
        document.activeElement.blur();
      }, 100);
    };
    window.addEventListener('blur', blurEvent);
    const keydownEvent = (e) => {
      console.log(props.mode);

      if (e.key === 'r') props.createTempRiff('audio', props.videoID, true);
      else if (e.key === 't') props.createTempRiff('text', props.videoID);
      else if (props.mode === EDIT_MODE || props.mode === EDIT_NEW_MODE) return;
      else if (e.key === 'j' || e.key === 'ArrowLeft' || e.key === 'Left')
        // I actually took MS specific BS into account
        window.rifftubePlayer.seekTo(
          Math.max(window.rifftubePlayer.getCurrentTime() - 5, 0),
          true
        );
      else if (e.key === 'l' || e.key === 'ArrowRight' || e.key === 'Right')
        window.rifftubePlayer.seekTo(
          Math.min(window.rifftubePlayer.getCurrentTime() + 5, props.duration),
          true
        );
      else if (e.key === ' ' || e.key === 'k') {
        props.togglePlayerMode();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', keydownEvent);

    return () => {
      window.removeEventListener('blur', blurEvent);
      window.removeEventListener('keydown', keydownEvent);
    };
  }, [props]);
  */

  //console.log("ec props", props);

  return (
        <div className="control-panel">
          <button className="btn" id="change-video-btn" onClick={(e) => {
              const vPrompt = prompt("Paste YouTube URL or video ID:");
              if ( vPrompt )
              {
                const vID = extractVideoID(vPrompt);
                navigate(`/riff/${vID}`);
                props.setVideoID(vID);
                props.getAllRiffs(vID);
                props.getMyRiffs(vID);
              }
            }}>
            Change Video
          </button>
          {
            props.loggedIn ?
            (
              <React.Fragment>
                {
                  props.userInfo?.name ?
                  (
                    <div className="riffer-name">
                      Riffer Name:&nbsp;
                      {props.userInfo.name}
                    </div>
                  ) : null

                  /* to add back later <Collaboration /> */
                }
                <RiffList />
                <template ref={templateRef}></template>
              </React.Fragment>
            ) : 
              <div>
                <h2 className="add-riff-title">Sign In</h2>
                <Login /> <p>to get started</p>
              </div>
          }
        </div>
  );
}

let mapStateToProps = (state) => ({
  mode: state.mode,
  userInfo: state.userInfo,
  videoID: state.videoID,
  duration: state.duration,
  recorder: state.recorder,
  loggedIn: state.loggedIn,
  confirmed: state.confirmed,
  rifftubePlayer: state.rifftubePlayer,
});

const mapDispatchToProps = {
  setRifferName,
  togglePlayerMode,
  setRecorder,
  saveNewRiff,
  saveEditRiff,
  setVideoID,
  getAllRiffs,
  getMyRiffs,
};

export default connect(mapStateToProps, mapDispatchToProps)(EditControls);
