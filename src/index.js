import { h, app } from "hyperapp";
import "./style.css";

const MEDIA_CONST = {'mandatory': {'OfferToReceiveAudio':true, 'OfferToReceiveVideo':true }};

const state = {
  count: 0,
  selfVideoSrc: "",
  selfStream: null,
  peer: null,
  selfSDP: null,
  partnerSDP: null,
  partnerStream: null,
  partnerVideoSrc: "",
  selfICEs: [],
  partnerICEs: []
};

const actions = {
  down: () => state => ({ count: state.count - 1 }),
  up: () => state => ({ count: state.count + 1 }),

  startVideo: () => async (state, actions) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    actions.setSelfStream(stream);
  },

  setSelfStream: stream => {
    return { selfStream: stream, selfVideoSrc: URL.createObjectURL(stream) };
  },

  connect: () => (state, actions) => {
    const peer = (() => {
      // peer connectionを新規作成
      const p = new RTCPeerConnection({ iceServers: [] });
      p.onicecandidate = e => {
        console.log("on candidate", e.candidate);
        if (e.candidate) {
          actions.setSelfICE(e.candidate);
        }
      };
      p.addStream(state.selfStream);
      p.onaddstream = e => {
        actions.setPartnerStream(e.stream);
      };
      return p;
    })();
    // offerを作成する
    peer.createOffer(MEDIA_CONST).then(sd => {
      actions.setSelfSDP(sd);
    });
    return { peer };
  },

  setSelfSDP: (selfSDP) => state => {
    state.peer.setLocalDescription(selfSDP);
    return { selfSDP };
  },

  setPartnerStream: stream => {
    return { partnerStream: stream, partnerVideoSrc: URL.createObjectURL(stream) };
  },

  onReceivePartnerSDP: e => (state, actions) => {
    const partnerSDP = JSON.parse(e.target.value);
    return { partnerSDP };
  },

  setPartnerSDP: () => (state, actions) => {
    const { partnerSDP } = state;
    let { peer } = state;
    if (peer) {
      // answerが来たのでそれをセットして接続を開始する
      peer.setRemoteDescription(new RTCSessionDescription(partnerSDP));
    } else {
      // offerが来たのでanswerを作成する
      peer = (() => {
        // create peer connection
        const p = new RTCPeerConnection({ iceServers: [] });
        p.onicecandidate = e => {
          if (e.candidate) {
            actions.setSelfICE(e.candidate);
          }
        };
        p.addStream(state.selfStream);
        p.onaddstream = e => {
          actions.setPartnerStream(e.stream);
        };
        return p;
      })();

      peer.setRemoteDescription(new RTCSessionDescription(partnerSDP));
      peer.createAnswer(MEDIA_CONST).then(selfSDP => {
        actions.setSelfSDP(selfSDP);
      });
    }
    return { partnerSDP, peer };
  },

  setSelfICE: selfICE => state => {
    state.selfICEs.push(selfICE);
    return { selfICEs: state.selfICEs };
  },

  onReceivePartnerICE: e => (state, actions) => {
    const partnerICEs = JSON.parse(e.target.value);
    return { partnerICEs };
  },

  setPartnerICE: () => (state, actions) => {
    const { partnerICEs, peer } = state;
    partnerICEs.forEach(ice => {
      peer.addIceCandidate(ice);
    });
    return {};
  }
};

const view = (state, actions) => {
  console.log("update", state);
  return <main>
    <button type="button" onclick={actions.startVideo}>ビデオキャプチャ開始</button>
    <button type="button" onclick={actions.connect}>接続開始</button>
    <div>
      <video src={state.selfVideoSrc} autoplay controls></video>
      <video src={state.partnerVideoSrc} autoplay controls></video>
    </div>
    <div>
      <p>自分のSDP(相手に教える必要がある)</p>
      <textarea rows="5" cols="100" disabled>{JSON.stringify(state.selfSDP)}</textarea>
    </div>
    <div>
      <p>相手のSDP(自分が知る必要がある)</p>
      <textarea rows="5" cols="100" onchange={actions.onReceivePartnerSDP}></textarea>
      <button type="button" onclick={actions.setPartnerSDP}>読み込み</button>
    </div>
    <div>
      <p>自分のICE Candidate(相手に教える必要がある)</p>
      <textarea rows="5" cols="100" disabled>{JSON.stringify(state.selfICEs)}</textarea>
    </div>
    <div>
      <p>相手のICE Candidate(自分が知る必要がある)</p>
      <textarea rows="5" cols="100" onchange={actions.onReceivePartnerICE}></textarea>
      <button type="button" onclick={actions.setPartnerICE}>読み込み</button>
    </div>
  </main>
};

export const main = app(state, actions, view, document.body);