;; Patient Identity Contract
;; Manages secure participant profiles in the precision medicine platform

;; Define data maps
(define-map patients
  { patient-id: (buff 20) }
  {
    name: (string-utf8 100),
    date-of-birth: uint,
    contact-info: (string-utf8 100),
    active: bool,
    created-at: uint
  }
)

(define-map patient-auth
  { patient-id: (buff 20) }
  {
    owner: principal,
    authorized-providers: (list 20 principal)
  }
)

;; Define error codes
(define-constant ERR_UNAUTHORIZED u1)
(define-constant ERR_ALREADY_EXISTS u2)
(define-constant ERR_NOT_FOUND u3)

;; Check if caller is the patient or an authorized provider
(define-private (is-authorized (patient-id (buff 20)))
  (let ((auth-data (unwrap! (map-get? patient-auth { patient-id: patient-id })
                           false)))
    (or (is-eq tx-sender (get owner auth-data))
        (is-some (index-of (get authorized-providers auth-data) tx-sender)))))

;; Register a new patient
(define-public (register-patient
    (patient-id (buff 20))
    (name (string-utf8 100))
    (date-of-birth uint)
    (contact-info (string-utf8 100)))
  (begin
    ;; Check if patient already exists
    (asserts! (is-none (map-get? patients { patient-id: patient-id }))
              (err ERR_ALREADY_EXISTS))

    ;; Add patient data
    (map-set patients
      { patient-id: patient-id }
      {
        name: name,
        date-of-birth: date-of-birth,
        contact-info: contact-info,
        active: true,
        created-at: block-height
      })

    ;; Set authorization data
    (map-set patient-auth
      { patient-id: patient-id }
      {
        owner: tx-sender,
        authorized-providers: (list)
      })

    (ok true)))

;; Update patient information
(define-public (update-patient-info
    (patient-id (buff 20))
    (name (string-utf8 100))
    (contact-info (string-utf8 100)))
  (begin
    ;; Check authorization
    (asserts! (is-authorized patient-id) (err ERR_UNAUTHORIZED))

    ;; Check if patient exists
    (asserts! (is-some (map-get? patients { patient-id: patient-id }))
              (err ERR_NOT_FOUND))

    ;; Get current patient data
    (let ((current-data (unwrap-panic (map-get? patients { patient-id: patient-id }))))
      ;; Update patient data
      (map-set patients
        { patient-id: patient-id }
        {
          name: name,
          date-of-birth: (get date-of-birth current-data),
          contact-info: contact-info,
          active: (get active current-data),
          created-at: (get created-at current-data)
        })

      (ok true))))

;; Add authorized healthcare provider
(define-public (add-authorized-provider
    (patient-id (buff 20))
    (provider principal))
  (begin
    ;; Only the patient owner can add providers
    (let ((auth-data (unwrap! (map-get? patient-auth { patient-id: patient-id })
                             (err ERR_NOT_FOUND))))

      (asserts! (is-eq tx-sender (get owner auth-data))
                (err ERR_UNAUTHORIZED))

      ;; Add provider to authorized list if not already present
      (map-set patient-auth
        { patient-id: patient-id }
        {
          owner: (get owner auth-data),
          authorized-providers: (unwrap-panic (as-max-len?
                                               (append (get authorized-providers auth-data) provider)
                                               u20))
        })

      (ok true))))

;; Remove authorized healthcare provider
(define-public (remove-authorized-provider
    (patient-id (buff 20))
    (provider principal))
  (begin
    ;; Only the patient owner can remove providers
    (let ((auth-data (unwrap! (map-get? patient-auth { patient-id: patient-id })
                             (err ERR_NOT_FOUND))))

      (asserts! (is-eq tx-sender (get owner auth-data))
                (err ERR_UNAUTHORIZED))

      ;; Filter out the provider to remove
      (map-set patient-auth
        { patient-id: patient-id }
        {
          owner: (get owner auth-data),
          authorized-providers: (filter not-provider (get authorized-providers auth-data))
        })

      (ok true))))

;; Helper function to filter out a specific provider
(define-private (not-provider (p principal))
  (not (is-eq p tx-sender)))

;; Get patient information (read-only)
(define-read-only (get-patient-info (patient-id (buff 20)))
  (begin
    ;; Check authorization
    (asserts! (is-authorized patient-id) (err ERR_UNAUTHORIZED))

    ;; Return patient data if exists
    (ok (map-get? patients { patient-id: patient-id }))))

;; Deactivate patient account
(define-public (deactivate-patient (patient-id (buff 20)))
  (begin
    ;; Only the patient owner can deactivate
    (let ((auth-data (unwrap! (map-get? patient-auth { patient-id: patient-id })
                             (err ERR_NOT_FOUND))))

      (asserts! (is-eq tx-sender (get owner auth-data))
                (err ERR_UNAUTHORIZED))

      ;; Get current patient data
      (let ((current-data (unwrap-panic (map-get? patients { patient-id: patient-id }))))
        ;; Update patient data to set active to false
        (map-set patients
          { patient-id: patient-id }
          {
            name: (get name current-data),
            date-of-birth: (get date-of-birth current-data),
            contact-info: (get contact-info current-data),
            active: false,
            created-at: (get created-at current-data)
          })

        (ok true)))))
