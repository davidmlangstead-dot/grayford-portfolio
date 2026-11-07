import {createContactHandler} from '../lib/contact.mjs';
import {checkBotId} from 'botid/server';
export default createContactHandler({verifyVisitor:async()=>{
 const result=await checkBotId({developmentOptions:{isDevelopment:false},advancedOptions:{checkLevel:'basic'}});
 return result.isHuman===true && result.isBot===false && result.isVerifiedBot===false && result.bypassed===false;
}});

