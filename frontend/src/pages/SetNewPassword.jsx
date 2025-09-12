import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import apiClient from "../api/axios";
import styles from "../css/csslogin.module.css";

export default function SetNewPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  useEffect(() => {
    if (!uid || !token) {
      setError("El enlace de restablecimiento es inválido o ha expirado.");
    }
  }, [uid, token]);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiClient.post("/password-reset-confirm/", {
        uid,
        token,
        password,
      });
      setMessage(res.data.message + " Serás redirigido en 3 segundos...");
      setTimeout(() => navigate("/"), 3000);

    } catch (err) {
      const errorData = err.response?.data?.error;
      if (Array.isArray(errorData)) {
        setError(errorData.join(" "));
      } else {
        setError(errorData || "Ocurrió un error al cambiar la contraseña.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.containerFormWrapper}>
      <div className={`${styles.containerForm} ${styles.signIn} ${styles.active}`}>
        <form className={styles.formulario} onSubmit={handleSetPassword}>
          <h2 className={styles.createAccount}>Establecer Nueva Contraseña</h2>

          {error && !message && <p style={{ color: "red", marginTop: '1rem' }}>{error}</p>}
          {message && <p style={{ color: "lightgreen", marginTop: '1rem' }}>{message}</p>}

          {uid && token && !message && (
            <>
              <p className={styles.cuentaGratis}>Ingresa tu nueva contraseña.</p>
              <input
                type="password"
                placeholder="Nueva contraseña (mín. 8 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.formularioInput}
                required
              />
              <input
                type="password"
                placeholder="Confirmar nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.formularioInput}
                required
              />
              <button type="submit" className={styles.slideButton} disabled={isLoading}>
                <span className={styles.slideContent}>
                  <span className={styles.text}>{isLoading ? "Cambiando..." : "Cambiar Contraseña"}</span>
                  <span className={styles.icon}>
                    <i className="fas fa-save"></i>
                  </span>
                </span>
              </button>
            </>
          )}

          {error && (
            <Link to="/" className={styles.resetPasswordBtn}>
              Volver al inicio
            </Link>
          )}
        </form>
      </div>
    </div>
  );
}
