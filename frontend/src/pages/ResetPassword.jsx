import { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // <-- importamos useNavigate
import apiClient from "../api/axios";
import styles from "../css/csslogin.module.css";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate(); // <-- inicializamos navigate

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    if (!email) {
      setError("Debes ingresar un correo válido");
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiClient.post("/password-reset/", { email });
      setMessage(res.data.message);
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Ocurrió un error al enviar el correo";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.containerFormWrapper}>
      <div className={`${styles.containerForm} ${styles.signIn} ${styles.active}`}>
        <form className={styles.formulario} onSubmit={handleReset}>
          <h2 className={styles.createAccount}>Restablecer Contraseña</h2>
          
          {!message ? (
            <>
              <p className={styles.cuentaGratis}>Ingresa tu correo para recibir el enlace de recuperación.</p>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.formularioInput}
                required
              />
              {error && <p style={{ color: "red", marginTop: '1rem' }}>{error}</p>}
              <button type="submit" className={styles.slideButton} disabled={isLoading}>
                <span className={styles.slideContent}>
                  <span className={styles.text}>{isLoading ? "Enviando..." : "Enviar Enlace"}</span>
                  <span className={styles.icon}>
                    <i className="fas fa-arrow-right"></i>
                  </span>
                </span>
              </button>
              {/* Botón de volver al inicio */}
              <button
                type="button"
                className={styles.resetPasswordBtn}
                onClick={() => navigate("/")} // <-- redirige al login
                style={{ marginTop: "1rem" }}
              >
                Volver al inicio
              </button>
            </>
          ) : (
            <div style={{marginTop: '2rem'}}>
              <p style={{ color: "lightgreen", fontSize: '1.1rem' }}>{message}</p>
              <Link to="/" className={styles.resetPasswordBtn}>
                Volver al inicio
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
