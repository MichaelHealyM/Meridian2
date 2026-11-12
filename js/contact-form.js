/* Contact form: validation (Bootstrap's .is-invalid / .invalid-feedback), the extra "contract"
   fields, and sending to Formspree. */
(() => {
  // Keep these in step with index.html (the "Topic" dropdown value and your email address)
  const CONTRACT_TOPIC_VALUE = 'contract';
  const CONTACT_EMAIL = 'hello@meridian.example';
  const { Toast } = bootstrap;

  // ---- contact-form.client ----
  const STATUS = {
    sending: { classes: 'text-body-secondary', text: 'Sending…' },
    success: {
      classes: 'alert alert-success py-2 px-3',
      text: 'Thanks! An engineer will reply within one working day.',
    },
    failure: {
      classes: 'alert alert-danger py-2 px-3',
      text: `Could not send. Please email ${CONTACT_EMAIL} instead.`,
    },
  };
  const form = document.querySelector('#contact-form');
  const topicSelect = document.querySelector('#contact-topic');
  const contractFields = document.querySelector('#contract-fields');
  const statusMessage = document.querySelector('#contact-form-status');
  const spinner = document.querySelector('#contact-spinner');
  const spamTrap = form.elements.namedItem('_gotcha');
  function updateContractFieldsVisibility() {
    const isContract = topicSelect.value === CONTRACT_TOPIC_VALUE;
    contractFields.classList.toggle('d-none', !isContract);
    contractFields.querySelectorAll('[data-contract-required]').forEach((input) => {
      input.required = isContract;
    });
  }
  function validateField(field) {
    const isValid = field.checkValidity();
    field.classList.toggle('is-invalid', !isValid);
    field.setAttribute('aria-invalid', String(!isValid));
    return isValid;
  }
  function showStatus(kind) {
    statusMessage.className = `${STATUS[kind].classes} mb-0`;
    statusMessage.textContent = STATUS[kind].text;
  }
  async function sendMessage() {
    showStatus('sending');
    spinner.classList.remove('d-none');
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Form endpoint responded with ${response.status}`);
      form.reset();
      updateContractFieldsVisibility();
      showStatus('success');
      Toast.getOrCreateInstance(document.querySelector('#contact-sent-toast')).show();
    } catch {
      showStatus('failure');
    } finally {
      spinner.classList.add('d-none');
    }
  }
  topicSelect.addEventListener('change', updateContractFieldsVisibility);
  updateContractFieldsVisibility();
  form.addEventListener('input', (event) => {
    const field = event.target;
    if (field.getAttribute('aria-invalid') === 'true') validateField(field);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const fields = [...form.querySelectorAll('input[name], select[name], textarea[name]')];
    const invalidFields = fields.filter((field) => field.willValidate && !validateField(field));
    if (invalidFields.length > 0) return invalidFields[0].focus();
    if (spamTrap.value) return;
    void sendMessage();
  });
})();
