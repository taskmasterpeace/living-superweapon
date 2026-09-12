import {AudioBus} from '../core/audio.js';
import {mountSoundLibrary} from './sound-library.js';
import './workshop-page.css';
const nav=document.createElement('nav');nav.className='workshop-nav';nav.innerHTML='<a href="powerworld.html">POWERWORLD</a><a href="studio.html">Character Studio</a><a href="sound-library.html" aria-current="page">Sound Library</a><a href="gadget-library.html">Gadget Catalog</a>';document.body.append(nav);
const backend=new AudioBus();const panel=mountSoundLibrary({host:document.body,backend,page:true});window.AUDIO_WORKSHOP={backend,...panel};
