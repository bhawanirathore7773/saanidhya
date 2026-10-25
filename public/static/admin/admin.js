(function () {
  'use strict';
  var base = document.body.getAttribute('data-admin-base') || '/admin';
  function cookie(name) { var m = document.cookie.match('(?:^|; )' + name + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : ''; }

  // mobile menu
  var menu = document.querySelector('[data-menu]'), side = document.getElementById('side');
  if (menu && side) menu.addEventListener('click', function () { side.classList.toggle('open'); });

  // select all
  document.querySelectorAll('[data-select-all]').forEach(function (box) {
    box.addEventListener('change', function () {
      document.querySelectorAll('input[name="ids"]').forEach(function (c) { c.checked = box.checked; });
    });
  });

  // confirm before delete
  document.querySelectorAll('[data-confirm]').forEach(function (el) {
    el.addEventListener('click', function (e) { if (!window.confirm(el.getAttribute('data-confirm'))) e.preventDefault(); });
  });
  document.querySelectorAll('[data-confirm-if]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var sel = btn.form && btn.form.querySelector('select[name="action"]');
      if (sel && sel.value === btn.getAttribute('data-confirm-if') && !window.confirm('Delete the ticked items for good?')) e.preventDefault();
    });
  });

  // picture preview before upload
  document.querySelectorAll('input[type=file][data-preview]').forEach(function (input) {
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f || f.type.indexOf('image/') !== 0) return;
      var holder = input.parentNode.querySelector('.current'), img;
      if (!holder) { holder = document.createElement('div'); holder.className = 'current'; input.parentNode.insertBefore(holder, input); }
      img = holder.querySelector('img');
      if (!img) { img = document.createElement('img'); holder.insertBefore(img, holder.firstChild); }
      img.src = URL.createObjectURL(f);
    });
  });

  // stop double submits and warn that photos take a moment
  document.querySelectorAll('form[data-admin-form]').forEach(function (form) {
    form.addEventListener('submit', function () {
      var hasFile = Array.prototype.some.call(form.querySelectorAll('input[type=file]'), function (i) { return i.files && i.files.length; });
      form.querySelectorAll('button[type=submit]').forEach(function (b) { b.disabled = true; if (hasFile && !b.name) b.textContent = 'Uploading, please wait...'; });
    });
  });

  // rich text editor (Quill from a CDN). If it cannot load, the plain box stays usable.
  var areas = document.querySelectorAll('textarea[data-richtext]');
  if (areas.length && window.Quill) {
    areas.forEach(function (ta) {
      var holder = document.createElement('div'); holder.className = 'rt-editor'; ta.parentNode.insertBefore(holder, ta);
      var quill = new window.Quill(holder, {
        theme: 'snow', placeholder: 'Write here...',
        modules: { toolbar: { container: [[{ header: [2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['blockquote', 'link', 'image'], ['clean']], handlers: { image: pickImage } } }
      });
      quill.root.innerHTML = ta.value;
      var form = ta.form;
      if (form) form.addEventListener('submit', function () {
        var html = quill.root.innerHTML;
        ta.value = (html === '<p><br></p>') ? '' : html;
      });
      function pickImage() {
        var input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
        input.onchange = function () {
          if (!input.files[0]) return;
          var data = new FormData(); data.append('upload', input.files[0]);
          fetch(base + '/upload-image/', { method: 'POST', body: data, headers: { 'X-CSRFToken': cookie('csrftoken') }, credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (j) { if (j.url) { var at = (quill.getSelection(true) || { index: quill.getLength() }).index; quill.insertEmbed(at, 'image', j.url); } else { window.alert(j.error || 'Upload failed'); } })
            .catch(function () { window.alert('Upload failed'); });
        };
        input.click();
      }
    });
  } else {
    areas.forEach(function (ta) { ta.hidden = false; ta.rows = 14; });
  }
})();
