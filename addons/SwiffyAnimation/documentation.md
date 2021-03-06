## Description

This addon allows users to embed animations and other projects created in Adobe Flash and converted with Google Swiffy plugin.

## Properties

<table border='1'>
    <tr>
        <th>Property name</th>
        <th>Description</th>
    </tr>
    <tr>
        <td>Animations</td>
        <td><ul><li><b>Swiffy File</b> – A file generated by Google Swiffy plugin for Adobe Flash. This file needs to be modified as described below before uploading it.
<li><b>Auto Play</b> – If this property is disabled, the addon will wait for the "start()" command from Advanced Connector or any other module capable of executing commands, such as e.g. Double State Button. Otherwise the animation will be loaded and started automatically.
<li><b>Disable Transparent Background</b> – The animation background is transparent by default. If you wish to use the background color from Flash’s Stage, enable this option.
</li></ul>
<p><em>This property allows online resources. <a href="/doc/page/Online-resources">Find out more »</a></em></p>
</td>
    </tr>
    <tr>
    <td>Initial Animation</td>
        <td>The item number of the initially displayed animation.</td>
    </tr>
</table>

##Swiffy html file modification

A file generated by Google swiffy contains the entire html structure. What needs to be sent to the addon is only the contents of the "script" tag that has the definition of swiffyobject variable. You need to simply open the file in a text editor such as notepad and remove everything except for the part beginning with"swiffyobject = {"tags":(...)” etc. and ending with a semicolon.
All contents of a  properly modified file should look like this:

swiffyobject = {"tags":[{"type":9,"actions":[{"constants": (…)    
(...)     
"frameCount":140,"frameRate":25,"version":11};    

##Supported commands

<table border='1'>
<tbody>
    <tr>
        <th>Command name</th>
        <th>Params</th>
        <th>Description</th>
    </tr>
<tr>
        <td>show</td>
        <td>---</td>
        <td>Shows the addon.</td>
</tr>
<tr>
        <td>hide</td>
        <td>---</td>
        <td>Hides the addon.</td>
    </tr>
    <tr>
        <td>switchAnimation</td>
        <td>item</td>
        <td>Changes the visible animation to the one with the item number provided as a parameter.</td>
    </tr>
<tr>
        <td>start</td>
        <td>item</td>
        <td>If the animation has the Auto Play parameter disabled, it waits for this command to start.</td>
</tr>
<tr>
        <td>replay</td>
        <td>item</td>
        <td>Destroys the swiffy object of the current animation (or the one which item number is provided), creates it again, and then starts the animation.</td>
</tr>
<tr>
        <td>setVars</td>
        <td>commands</td>
        <td>Sets swiffy’s representation of "Flash variables". The parameter must be a string containing two words separated by a comma, e.g. setVars("action,play");. The first word is the variable name, and the second is its value.</td>
</tr>
</tbody>
</table>

##Controlling the animation

The only way to control swiffy animations is to use their setFlashVars method represented by setVars command of the addon. Flash project needs to be prepared before being exported to swiffy by adding a code in ActionScript to the main timeline, e.g.:

    _root.onEnterFrame = function(){    
	  switch(_level0.myresponse){    
		  case 'play':    
			  _root.play();    
			  break;    

		  case 'pause':    
			  _root.stop();    
			  break;    

		  default :    
			  break;    
	  }
	_level0.myresponse = undefined;    
    }    

Then by using the following code, e.g. in a Single State Button, we can stop the animation at any time by pressing the button:

SwiffyAnimation1.setVars("myresponse,pause");

##Warning

In your Adobe Flash/Animate projects please do not use getURL method available in ActionScript 2 and 3 that redirects a page or calls a javasctipt method or code.
In some cases, this causes problems with communication between the website and the iframe containing the lesson.

If you wish to call the javascript function from inside of the Swiffy animation, please use the ActionScript's ExternalInterface object. This is an example in ActionScript 2.0:
<pre><code>flash.external.ExternalInterface.call("player.getPlayerServices().getModule('Image1').hide()");</code></pre>

## Events

Swiffy Animation addon does not send events.

## CSS classes

<table border='1'>
    <tr>
        <th>Class name</th>
        <th>Description</th>
    </tr>
    <tr>
        <td>.swiffyContainer</td>
        <td>Main class containing the entire Addon's content.</td>
    </tr>
</table>

## Styles from a sample presentation

    .SwiffyAnimation_test{    
      background: #ffffff;    
      border: 1px solid #bbbbbb;    
      overflow: hidden;    
      padding: 2px;    
     }    

##Demo presentation
[Demo presentation](/embed/5736295296925696 "Demo presentation") contains examples of how to use the Swiffy Animation addon.                                  