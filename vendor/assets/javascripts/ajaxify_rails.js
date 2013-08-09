var activate, active, ajaxify, base_path_regexp, base_path_regexp_cache, base_paths, content_container, correct_url, dont_correct_url, flash_types, get_content_container, ignore_hash_change, init, initial_history_state, is_string, load, load_page_from_hash, on_ajaxify_success, on_hash_change, protocol_with_host, push_state, push_state_enabled, rails_ujs_fix, regexp_escape, reload_page_if_assets_stale, scroll_page_to_top, scroll_to_top, set_content_container, set_scroll_to_top, show_flashes, update_url, url_params_as_object;

active = true;

content_container = 'main';

base_paths = null;

flash_types = ['notice'];

dont_correct_url = false;

push_state_enabled = true;

ignore_hash_change = null;

load_page_from_hash = null;

scroll_to_top = true;

initial_history_state = {
  url: window.location.href,
  data: {
    ajaxified: true
  }
};

base_path_regexp_cache = null;

activate = function(new_active) {
  if (new_active == null) {
    new_active = true;
  }
  return active = new_active;
};

get_content_container = function() {
  return content_container;
};

set_content_container = function(new_content_container) {
  return content_container = new_content_container;
};

init = function(options) {
  if (options == null) {
    options = {};
  }
  if ('base_paths' in options) {
    base_paths = options.base_paths;
  }
  if ('flash_types' in options) {
    flash_types = options.flash_types;
  }
  if ('push_state_enabled' in options) {
    push_state_enabled = options.push_state_enabled;
  }
  if ('active' in options) {
    active = options.active;
  }
  if ('content_container' in options) {
    content_container = options.content_container;
  }
  if (!($('meta[name="ajaxify:dont_correct_url"]').length > 0)) {
    correct_url();
  }
  if ('scroll_to_top' in options) {
    scroll_to_top = options.scroll_to_top;
  }
  return rails_ujs_fix();
};

ajaxify = function() {
  var exclude_selector, protocol_and_hostname;
  if (active) {
    if (load_page_from_hash) {
      load_page_from_hash = false;
      on_hash_change();
    }
    protocol_and_hostname = "" + window.location.protocol + "//" + window.location.hostname;
    $('body').on('click', "a[href^='/']:not(.no_ajaxify), a[href^='" + protocol_and_hostname + "']:not(.no_ajaxify)", function() {
      var $this;
      $this = $(this);
      load({
        url: $this.attr('href'),
        type: $this.data('method'),
        confirm: $this.data('confirm'),
        element: $this,
        scroll_to_top: set_scroll_to_top($this)
      });
      return false;
    });
    exclude_selector = ":not(.no_ajaxify):not([enctype='multipart/form-data'])";
    $('body').on('submit', "form[action^='/']" + exclude_selector + ",                            form[action^='" + protocol_and_hostname + "']" + exclude_selector + ",                            form[action='']" + exclude_selector, function() {
      var $this, action, form_params;
      $this = $(this);
      form_params = $(this).serialize();
      form_params += '&ajaxified=true';
      action = $this.attr('action');
      load({
        url: action !== '' ? action : '/',
        data: form_params,
        type: $this.attr('method'),
        confirm: $this.data('confirm'),
        element: $this,
        scroll_to_top: set_scroll_to_top($this)
      });
      return false;
    });
  }
  $(window).on('popstate', function(e) {
    var data;
    e = e.originalEvent;
    data = e.state && e.state.data ? url_params_as_object(e.state.data) : null;
    if (data && data.ajaxified) {
      e.state.cache = false;
      return load(e.state, true);
    }
  });
  return window.onhashchange = function() {
    if (!ignore_hash_change) {
      return on_hash_change();
    } else {
      return ignore_hash_change = false;
    }
  };
};

load = function(options, pop_state) {
  var data, type;
  if (pop_state == null) {
    pop_state = false;
  }
  if (!load_page_from_hash) {
    data = options.data || {
      ajaxified: true
    };
    if (options.type && options.type === 'delete') {
      type = 'post';
      if (is_string(data)) {
        data += '&_method=delete';
      } else {
        data._method = 'delete';
      }
    } else {
      type = options.type || 'get';
    }
    if (options.confirm) {
      if ($.rails !== void 0) {
        if (!$.rails.confirm(options.confirm, options.element)) {
          return false;
        }
      } else {
        if (!confirm(options.confirm)) {
          return false;
        }
      }
    }
    $(document).trigger('ajaxify:before_load', [options, pop_state]);
    return $.ajax({
      url: options.url,
      dataType: 'html',
      data: data,
      type: type,
      cache: true,
      beforeSend: function(xhr) {
        $("#" + content_container).html("<div class='ajaxify_loader'></div>");
        if (!('scroll_to_top' in options)) {
          options.scroll_to_top = scroll_to_top;
        }
        if (options.scroll_to_top) {
          return scroll_page_to_top();
        }
      },
      success: function(data, status, jqXHR) {
        return on_ajaxify_success(data, status, jqXHR, pop_state, options);
      }
    });
  }
};

update_url = function(options, pop_state) {
  var get_request, hash;
  if (pop_state == null) {
    pop_state = false;
  }
  get_request = !options.type || options.type.toLowerCase() === 'get';
  if (!pop_state && get_request) {
    if (push_state()) {
      if (initial_history_state !== '') {
        window.history.replaceState(initial_history_state, '');
        initial_history_state = '';
      }
      options.data || (options.data = {});
      options.data.ajaxified = true;
      return window.history.pushState({
        url: options.url,
        data: options.data,
        type: options.type
      }, '', options.url);
    } else {
      ignore_hash_change = true;
      hash = "" + (options.url.replace(new RegExp(protocol_with_host()), ''));
      if (base_path_regexp()) {
        hash = hash.replace(base_path_regexp(), '');
        if (!(hash === '' || hash.indexOf('/') === 0)) {
          hash = "/" + hash;
        }
      }
      return window.location.hash = hash;
    }
  }
};

on_ajaxify_success = function(data, status, jqXHR, pop_state, options) {
  var current_url, flashes, original_request_type, title;
  $("#" + content_container).html(data);
  if ($('#ajaxify_content').length > 0) {
    title = $('#ajaxify_content').data('page-title');
    flashes = $('#ajaxify_content').data('flashes');
    original_request_type = options.type;
    current_url = $('#ajaxify_content #ajaxify_location').html();
    if (options.url !== current_url) {
      options.url = current_url.replace(/(&|&amp;|\?)ajaxify_redirect=true/, '');
      options.type = 'GET';
    }
    if (!(original_request_type && original_request_type.toLowerCase() === 'post')) {
      reload_page_if_assets_stale(options.url, jqXHR);
    }
    update_url(options, pop_state);
    $(document).trigger('ajaxify:content_inserted');
    $("#" + content_container + " #ajaxify_content").remove();
    if (title) {
      document.title = title.replace(/&amp;/, '&');
    }
    show_flashes(flashes);
    return $(document).trigger('ajaxify:content_loaded', [data, status, jqXHR, options.url]);
  }
};

correct_url = function() {
  var match, path;
  if (active) {
    if (window.location.hash.indexOf('#') === 0) {
      if (!window.location.hash.match(/^#(\/|\?)/)) {
        return;
      }
      if (!push_state()) {
        return load_page_from_hash = true;
      } else {
        path = window.location.pathname;
        if (path === '/') {
          path = '';
        }
        path = path + window.location.hash.replace(/#/, "");
        return window.location.href = "" + (protocol_with_host()) + path;
      }
    } else if (!push_state()) {
      if (base_path_regexp() && (match = window.location.pathname.match(base_path_regexp()))) {
        if (match[0] === window.location.pathname) {
          if (window.location.search === '') {
            return;
          } else {
            path = match[0].replace(/\?/, '') + '#';
          }
        } else {
          path = "" + (match[0].replace(/\/$/, '')) + "#/" + (window.location.pathname.replace(match[0], ''));
        }
      } else if (window.location.pathname === '/') {
        if (window.location.search !== '') {
          window.location.href = "" + (protocol_with_host()) + "/#/" + window.location.search;
        }
        return;
      } else {
        path = "/#" + window.location.pathname;
      }
      return window.location.href = "" + (protocol_with_host()) + path + window.location.search;
    }
  }
};

show_flashes = function(flashes) {
  return $.each(flash_types, function() {
    if (flashes && flashes[this]) {
      $("#" + this).html(flashes[this]);
      $("#" + this).show();
      return $(document).trigger('ajaxify:flash_displayed', [this, flashes[this]]);
    } else {
      return $("#" + this).hide();
    }
  });
};

on_hash_change = function() {
  var hash_changed, match, url;
  url = window.location.hash.replace(/#/, "");
  if (match = window.location.pathname.match(base_path_regexp())) {
    url = match[0] + url;
  }
  if (url === '') {
    url = '/';
  }
  hash_changed = true;
  return load({
    url: url
  }, true);
};

base_path_regexp = function() {
  if (!base_paths) {
    return null;
  }
  if (base_path_regexp_cache) {
    return base_path_regexp_cache;
  }
  return base_path_regexp_cache = new RegExp("^\/(" + ($.map(base_paths, function(el) {
    el = regexp_escape(el);
    return "" + el + "($|\/|\\?)";
  }).join('|')) + ")", 'i');
};

is_string = function(variable) {
  return Object.prototype.toString.call(variable) === '[object String]';
};

url_params_as_object = function(param_string_or_object) {
  if (!is_string(param_string_or_object)) {
    return param_string_or_object;
  }
  return JSON.parse('{"' + decodeURI(param_string_or_object.replace(/&/g, "\",\"").replace(/\=/g, "\":\"")) + '"}');
};

regexp_escape = function(str) {
  return str.replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\-]', 'g'), '\\$&');
};

protocol_with_host = function() {
  var loc;
  loc = window.location;
  return "" + loc.protocol + "//" + loc.host;
};

push_state = function() {
  return push_state_enabled && window.history.pushState;
};

set_scroll_to_top = function($link_or_form) {
  var no_scroll, scroll;
  scroll = $link_or_form.hasClass('scroll_to_top');
  no_scroll = $link_or_form.hasClass('no_scroll_to_top');
  if (scroll || no_scroll) {
    return scroll && !no_scroll;
  } else {
    return scroll_to_top;
  }
};

scroll_page_to_top = function() {
  return $('html, body').animate({
    scrollTop: 0
  }, 500);
};

reload_page_if_assets_stale = function(url, jqXHR) {
  var digest_header;
  digest_header = jqXHR.getResponseHeader('Ajaxify-Assets-Digest');
  if (digest_header && digest_header !== $("meta[name='ajaxify:assets-digest']").attr('content')) {
    return document.location.href = url;
  }
};

rails_ujs_fix = function() {
  if (!('rails' in jQuery)) {
    return false;
  }
  return jQuery.rails.handleMethod = function(link) {
    var csrf_param, csrf_token, form, href, metadata_input, method, target;
    href = $.rails.href(link);
    method = link.data('method');
    target = link.attr('target');
    csrf_token = $('meta[name=csrf-token]').attr('content');
    csrf_param = $('meta[name=csrf-param]').attr('content');
    form = $("<form method='post' action='" + href + "'></form>");
    metadata_input = "<input name='_method' value='" + method + "' type='hidden' />";
    if (link.hasClass('no_ajaxify')) {
      form.addClass('no_ajaxify');
    }
    if (csrf_param !== void 0 && csrf_token !== void 0) {
      metadata_input += '<input name="' + csrf_param + '" value="' + csrf_token + '" type="hidden" />';
    }
    if (target) {
      form.attr('target', target);
    }
    form.hide().append(metadata_input).appendTo('body');
    return form.submit();
  };
};

this.Ajaxify = {
  init: init,
  ajaxify: ajaxify,
  load: load,
  update_url: update_url,
  activate: activate,
  set_content_container: set_content_container,
  get_content_container: get_content_container
};

jQuery(function() {
  return Ajaxify.ajaxify();
});
