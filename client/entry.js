import {initBotId} from 'botid/client/core';
import '../public/site.js';
initBotId({protect:[{path:'/api/contact',method:'POST',advancedOptions:{checkLevel:'basic'}}]});

