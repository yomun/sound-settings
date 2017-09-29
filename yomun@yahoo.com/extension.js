/*
 * Sound-Settings gnome extension
 * https://jasonmun.blogspot.my
 * 
 * Copyright (C) 2017 Jason Mun
 *
 * Sound-Settings gnome extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Sound-Settings gnome extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License.
 * If not, see <http://www.gnu.org/licenses/>.
 * 
 */

const Lang = imports.lang;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const Atk = imports.gi.Atk;
const Config = imports.misc.config;

const Gettext = imports.gettext.domain('gnome-shell-extension-sound-settings');
const _ = Gettext.gettext;

const DBusSessionManagerIface = '<node>\
  <interface name="org.gnome.SessionManager">\
    <method name="Inhibit">\
        <arg type="s" direction="in" />\
        <arg type="u" direction="in" />\
        <arg type="s" direction="in" />\
        <arg type="u" direction="in" />\
        <arg type="u" direction="out" />\
    </method>\
    <method name="Uninhibit">\
        <arg type="u" direction="in" />\
    </method>\
    <signal name="InhibitorAdded">\
        <arg type="o" direction="out" />\
    </signal>\
    <signal name="InhibitorRemoved">\
        <arg type="o" direction="out" />\
    </signal>\
  </interface>\
</node>';

const DBusSessionManagerProxy = Gio.DBusProxy.makeProxyWrapper(DBusSessionManagerIface);

const DBusSessionManagerInhibitorIface = '<node>\
  <interface name="org.gnome.SessionManager.Inhibitor">\
    <method name="GetAppId">\
        <arg type="s" direction="out" />\
    </method>\
  </interface>\
</node>';

const DBusSessionManagerInhibitorProxy = Gio.DBusProxy.makeProxyWrapper(DBusSessionManagerInhibitorIface);

const IndicatorName = "Sound-Setting";

const EnabledIcon = 'audio-headphones-symbolic';

let SoundSettingsIndicator;

const SoundSettings = new Lang.Class({
	Name: IndicatorName,
    Extends: PanelMenu.Button,

	_init: function(metadata, params) {
		this.parent(null, IndicatorName);
		this.actor.accessible_role = Atk.Role.TOGGLE_BUTTON;

		this._sessionManager = new DBusSessionManagerProxy(Gio.DBus.session,'org.gnome.SessionManager', '/org/gnome/SessionManager');
		
		this._last_app = "";
		
		this._inhibitorAddedId = this._sessionManager.connectSignal('InhibitorAdded', Lang.bind(this, this._inhibitorAdded));

		this._icon = new St.Icon({ icon_name: EnabledIcon, style_class: 'system-status-icon' });

		this.actor.add_actor(this._icon);
		this.actor.add_style_class_name('panel-status-button');
		this.actor.connect('button-press-event', Lang.bind(this, this.toggleState));
	},

	toggleState: function() {
		this.addInhibit('sound-settings');
	},

	addInhibit: function(app_id) {
		this._sessionManager.InhibitRemote(app_id, 0, "Inhibit by %s".format(IndicatorName), 12, Lang.bind(this, function(cookie) { this._last_app = app_id; }));
	},

	_inhibitorAdded: function(proxy, sender, [object]) {
		let inhibitor = new DBusSessionManagerInhibitorProxy(Gio.DBus.session, 'org.gnome.SessionManager', object);

		inhibitor.GetAppIdRemote(Lang.bind(this, function(app_id) {
			if (app_id != '' && app_id == this._last_app) {
				// this._icon.icon_name = "";
				let argv = ["gnome-control-center", "sound"];
				GLib.spawn_async(null, argv, null, GLib.SpawnFlags.SEARCH_PATH, null);
				argv = null;
			}
		}));
		
		inhibitor = null;
		
		this._last_app = "";
	},

	destroy: function() {
		this._sessionManager.disconnectSignal(this._inhibitorAddedId);
		this.parent();
	}
});

function enable() {
	SoundSettingsIndicator = new SoundSettings();
	Main.panel.addToStatusArea(IndicatorName, SoundSettingsIndicator);
}

function disable() {
	SoundSettingsIndicator.destroy();
	SoundSettingsIndicator = null;
}
