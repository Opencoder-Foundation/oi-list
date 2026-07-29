import "./Faq.css";
import Footer from "./Footer";

const Faq = () => {
  return (
    <main>
      <section className="faq-section">
        <h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="icon icon-tabler icons-tabler-outline icon-tabler-question-mark"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M8 8a3.5 3 0 0 1 3.5 -3h1a3.5 3 0 0 1 3.5 3a3 3 0 0 1 -2 3a3 4 0 0 0 -2 4" />
            <path d="M12 19l0 .01" />
          </svg>
          Najczęściej zadawane pytania (FAQ)
        </h2>

        <div className="faq-grid">
          <div className="faq-item">
            <h3>Czy rating działa tak samo jak na Codeforces?</h3>
            <p>
              Nie. Ratingi na platformach typu Codeforces wyliczane są dynamicznie
              na podstawie wyników poszczególnych rund (Elo / Glicko) i zmieniają się
              po każdym występie. Tutaj rating jest modelowany statystycznie na podstawie
              całych macierzy wyników danej edycji OI i ma na celu oszacowanie rzeczywistej
              trudności zadania oraz umiejętności uczestnika.
            </p>
          </div>

          <div className="faq-item">
            <h3>Jak dokładnie wyliczany jest rating zadań i osób?</h3>
            <p>
              Dla każdej osoby przypisujemy jej rating <code>a_i</code>, a dla każdego zadania rating <code>b_j</code>.
              Mając macierz wyników <code>S</code> (gdzie <code>S_ij ∈ [0, 1]</code> oznacza uzyskany procent punktów na zadaniu),
              chcemy znaleźć takie wartości <code>a</code> oraz <code>b</code>, aby spełnione było równanie:
            </p>
            <pre>sigmoid(a_i - b_j) ≈ S_ij</pre>
            <p>
              Ponieważ idealne przypisanie zazwyczaj nie istnieje, minimalizujemy błąd bezwzględny:
              <code>sum |S_ij - sigmoid(a_i - b_j)|</code>.
            </p>
          </div>

          <div className="faq-item">
            <h3>Jak wygląda proces uczenia / optymalizacji?</h3>
            <p>
              Zaczynamy od zerowych wektorów <code>a = [0]</code>, <code>b = [0]</code>.
              W każdej epoce dla każdej pary (osoba <code>i</code>, zadanie <code>j</code>) obliczamy błąd:
            </p>
            <pre>err = sigmoid(a_i - b_j) - S_ij</pre>
            <p>
              Następnie aktualizujemy parametry: <code>a_i -= err * lr</code> oraz <code>b_j += err * lr</code>.
              Współczynnik uczenia maleje z każdą epoką według wzoru <code>lr = 10 * (0.98 ^ epoch)</code>,
              co zapewnia szybką zbieżność na początku i stabilność w dalszych krokach.
              Dodatkowo po każdej epoce centrujemy średnią, wyrównując <code>a.mean() = 0</code>.
            </p>
          </div>

          <div className="faq-item">
            <h3>Jak łączone są wyniki pomiędzy różnymi edycjami OI?</h3>
            <p>
              Poszczególne edycje Olimpad nie mają bezpośredniego powiązania (poziom zawodników zmienia się w czasie),
              dlatego zakłada się, że ogólny poziom rywalizacji w każdej edycji jest zbliżony.
              Uznajemy, że rozkład umiejętności w każdym OI ma średnią <code>a.mean() = 0</code> oraz
              zezwala na normalizację odchylenia standardowego (<code>a.std()</code>), co pozwala porównywać trudność zadań
              pochodzących z zupełnie różnych edycji.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Faq;